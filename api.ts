import { GoogleSpreadsheet } from "google-spreadsheet";
import { TimelineDTO } from "./models/timeline";
import { PlaceDTO } from "./models/place";
import { User } from "./models/user";

const auth_file = process.env.login_val || "{}";
const auth_data = JSON.parse(auth_file.toString());
const doc = new GoogleSpreadsheet(
  "1OCGy1rjHKagj7RdVOcbpCAAJCg-GI78f1lUTH60B5Ho"
);

const drank_doc = new GoogleSpreadsheet(
  "11HKEo7IeUHuAzFgqS0FYWnQiaLSAvxFk9Fe4DWnttEE"
);

let initialized = false;
let drank_initialized = false;
export let places: PlaceDTO[] = [];

async function init() {
  if (!initialized) {
    await doc.useServiceAccountAuth({
      client_email: auth_data.client_email,
      private_key: auth_data.private_key,
    });
    await doc.loadInfo();
    initialized = true;
  }
}

async function init_drank() {
  if (!drank_initialized) {
    await drank_doc.useServiceAccountAuth({
      client_email: auth_data.client_email,
      private_key: auth_data.private_key,
    });
    await drank_doc.loadInfo();
    drank_initialized = true;
  }
}

export const getTimeline = async (): Promise<TimelineDTO[]> => {
  try {
    await init();
  } catch (e) {
    console.error(e);
    return [
      {
        arrival: "09:00",
        departure: "11:00",
        place: "KA",
        type: "location",
        description: "Frokost - Ta med drikke selv. Ringeklokke 505",
      },
    ];
  }
  const sheet = doc.sheetsByTitle["Timeline"];
  const rows = await sheet.getRows();
  return rows.map((row) => {
    const assumeRow = row as unknown as TimelineDTO;
    return {
      arrival: assumeRow.arrival,
      departure: assumeRow.departure,
      place: assumeRow.place,
      type: assumeRow.type,
      description: assumeRow.description || "",
    };
  });
};

export const getPlaces = async (): Promise<PlaceDTO[]> => {
  try {
    await init();
  } catch (e) {
    console.error(e);
    return [];
  }
  const sheet = doc.sheetsByTitle["Places"];
  const rows = await sheet.getRows();
  return rows.map((row) => ({
    name: row["name"] || "",
    lat: row["lat"] || "",
    long: row["long"] || "",
    url: row["url"] || "",
    description: row["description"] || "",
    displayName: row["displayName"] || "",
  }));
};

export async function getDranks(): Promise<any> {
  try {
    await init_drank();
  } catch (e) {
    console.error(e);
    return {
      metadata: {
        header: [],
      },
      rows: [],
    };
  }
  const sheet = drank_doc.sheetsByIndex[0];
  const rows = await sheet.getRows();
  const placeNames = sheet.headerValues;
  return {
    metadata: {
      header: placeNames.filter((name) => !!name),
    },
    rows: rows
      .filter((row) => !!row._rawData[0])
      .map((row) => {
        const [name, ...amounts]: string[] = row._rawData || [];
        return {
          name,
          amounts,
        };
      }),
  };
}

export async function registerUser(id: string, email: string): Promise<void> {
  try {
    await init();
  } catch (e) {
    console.error(e);
    return;
  }
  const sheet = doc.sheetsByTitle["Users"];
  const alreadyExists = await sheet
    .getRows()
    .then((rows) => rows.find((row) => row._rawData.includes(id)))
    .then((result) => !!result);
  if (alreadyExists) return;
  sheet.addRow([id, "", "", "", email]);
}

export async function getUserData(
  id: string
): Promise<{ ownerOfPlace?: string; drankName?: string; drankPlace?: string }> {
  const dummy_user = {
    ownerOfPlace: undefined,
    drankName: undefined,
    drankPlace: undefined,
  };
  try {
    await init();
  } catch (e) {
    console.error(e);
    return dummy_user;
  }

  const sheet = doc.sheetsByTitle["Users"];
  const rows = await sheet.getRows();
  const user = rows.find((row) => row["userId"] === id);
  if (!user) return dummy_user;
  return {
    ownerOfPlace: user["ownerOfPlace"],
    drankName: user["drankName"],
    drankPlace: user["drankPlace"],
  };
}
