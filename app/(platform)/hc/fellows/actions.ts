"use server";

import { currentHubCoordinator, getCurrentUser } from "#/app/auth";
import { db } from "#/lib/db";

async function checkAuth() {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    throw new Error("The session has not been authenticated");
  }
}

export type FellowDropoutReasonsGraphData = {
  name: string;
  value: number;
};

export async function fetchFellowDropoutReasons(hudId: string) {
  const dropoutData = await db.$queryRaw<FellowDropoutReasonsGraphData[]>`
    SELECT
      COUNT(*) AS value,
      drop_out_reason AS name
    FROM fellows
    WHERE
      drop_out_reason IS NOT NULL
      AND hub_id = ${hudId}
    GROUP BY
      drop_out_reason
  `;

  dropoutData.forEach((data) => {
    data.value = Number(data.value);
  });

  return dropoutData;
}

export async function fetchFellowDataCompletenessData(hubId: string) {
  const [fellowData] = await db.$queryRaw<{ percentage: number }[]>`
    SELECT
      AVG((
        (CASE WHEN mpesa_name IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN mpesa_number IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN cell_number IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN hub_id IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN gender IS NOT NULL THEN 1 ELSE 0 END)
        + (CASE WHEN id_number IS NOT NULL THEN 1 ELSE 0 END)
      ) / 6.0 * 100) AS percentage
    FROM fellows
    WHERE hub_id = ${hubId}
  `;

  if (!fellowData) {
    return [];
  }

  const percentage = +Number(fellowData.percentage).toFixed(2);

  return [
    { name: "actual", value: percentage },
    { name: "difference", value: 100 - percentage },
  ];
}

export type FellowSessionRatingAverages = {
  session_date: string;
  behaviour_rating: number;
  program_delivery_rating: number;
  dressing_and_grooming_rating: number;
  punctuality_rating: number;
};

export async function fetchFellowSessionRatingAverages(hubId: string) {
  const ratingAverages = await db.$queryRaw<FellowSessionRatingAverages[]>`
    SELECT
      CONCAT(TRIM(TO_CHAR(wfr.week, 'Month')), ' Week ', EXTRACT(WEEK FROM wfr.week)) AS session_date,
      AVG(wfr.behaviour_rating) AS behaviour_rating,
      AVG(wfr.program_delivery_rating) AS program_delivery_rating,
      AVG(wfr.dressing_and_grooming_rating) AS dressing_and_grooming_rating,
      AVG(wfr.punctuality_rating) AS punctuality_rating
    FROM weekly_fellow_ratings wfr
    INNER JOIN supervisors AS sup ON wfr.supervisor_id = sup.id
    WHERE
      sup.hub_id = ${hubId}
    GROUP BY
    wfr.week
    ORDER BY
    wfr.week
  `;

  if (!ratingAverages.length) {
    return [];
  }

  ratingAverages.forEach((item) => {
    item.behaviour_rating = Math.round(Number(item.behaviour_rating));
    item.program_delivery_rating = Math.round(
      Number(item.program_delivery_rating),
    );
    item.dressing_and_grooming_rating = Math.round(
      Number(item.dressing_and_grooming_rating),
    );
    item.punctuality_rating = Math.round(Number(item.punctuality_rating));
  });

  return ratingAverages;
}

export async function addUploadedFellowDocs(data: {
  fileName: string;
  link: string;
  fellowId: string;
  type: string;
}) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("The session has not been authenticated");
  }

  try {
    const cdata = await db.fellowDocuments.create({
      data: {
        fileName: data.fileName,
        link: data.link,
        fellowId: data.fellowId,
        uploadedBy: user.user.id,
        type: data.type,
      },
    });

    console.log(cdata);

    return {
      success: true,
      message: "Successfully uploaded the document.",
    };
  } catch (error) {
    console.error(error);
    return { error: "Something went wrong uploading the document" };
  }
}
