"use server";
import { ApiResponse } from "#/types/api.types";
import { getAttendanceDocument } from ".";
import { StudentAttendanceDocsFilters } from "./types";


export async function uploadAttendanceDocument(filters:StudentAttendanceDocsFilters) {
  try {

    const existing = await getAttendanceDocument(filters);


  } catch (error:any) {

    const response: ApiResponse = {
      success: false,
      message:`${error.message}`
    }

    return response;
  }
}
