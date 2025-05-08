import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Field, Form } from "./admin_slice";

export interface LoginCandidateInput {
  email: string;
  password: string;
}
interface Submission {
  responseId: string;
  formId?: string;
  value?: any;
  userEmail?: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
  score?: string;
  status?: string;
  warnings?: number;
  termsAccepted?: string;
}
export interface EditSubmissionInput {
  formId: string;
  responseId?: string;
  value: any;
  userEmail: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
  termsAccepted?: string;
  score?: number;
  status?: string;
}
export interface CandidateSubmission {
  id: number;
  responseId: string;
  formId: string;
  value: any;
  userEmail: string;
  startTime: string;
  endTime: string;
  duration: string;
  score: string;
  status: string;
  termsAccepted: string;
  warnings: number;
}
export interface EditSubmissionResponse {
  message: string;
}
export interface LoginCandidateResponse {
  message: string;
  email: string;
  candidateToken: string;
}

interface AddSubmissionResponse {
  message:string;
  responseId: string;
}

export interface CandidateAuthResponse {
  authorized: boolean;
  email: string;
}

export const candidateSlice = createApi({
  reducerPath: "candidate_api",
  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:5000/api/candidate",
    credentials: "include",
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("candidateToken");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Forms', 'Fields', 'Submissions'],
  endpoints: (builder) => ({
    loginCandidate: builder.mutation<
      LoginCandidateResponse,
      LoginCandidateInput
    >({
      query: ({ email, password }) => ({
        url: "/login",
        method: "POST",
        body: { email, password },
      }),
    }),

    checkCandidateAuth: builder.query<CandidateAuthResponse, void>({
      query: () => ({
        url: "/check-auth",
        method: "GET",
      }),
    }),

    logoutCandidate: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/logout",
        method: "POST",
      }),
    }),

    addSubmission: builder.mutation<
      AddSubmissionResponse,
      { formId: string; data: Submission }
    >({
      query: ({ formId, data }) => ({
        url: `form/${formId}/submit`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (_result, _error, { formId }) => [
        { type: "Submissions", id: formId },
      ],
    }),

    editSubmission: builder.mutation<
      EditSubmissionResponse,
      EditSubmissionInput
    >({
      query: ({ formId, ...body }) => ({
        url: `form/${formId}/submission`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { formId }) => [
        { type: "Submissions", id: formId },
      ],
    }),

    getCandidateSubmission: builder.query<CandidateSubmission, string>({
      query: (responseId) => `/submission/${responseId}`,
    }),

    updateTimer: builder.mutation<{ message: string }, { formId: string, userEmail: string, Timer: string }>({
      query: ({ formId, userEmail, Timer }) => ({
        url: `/form/${formId}/candidate/${userEmail}/timer`,
        method: 'PUT',
        body: { Timer },
      }),
    }),

    getFieldsByCandidateFormId: builder.query<Field[], string>({
      query: (formId) => `form/${formId}/field`,
      providesTags: (_result, _error, formId) => [
        { type: "Fields", id: formId },
      ],
    }),

    getFormById: builder.query<Form, string>({
      query: (formId) => `form/${formId}`,
      providesTags: (_result, _error, formId) => [
        { type: "Forms", id: formId },
      ],
    }),
  }),
});

export const {
  useLoginCandidateMutation,
  useCheckCandidateAuthQuery,
  useGetFormByIdQuery,
  useLogoutCandidateMutation,
  useGetFieldsByCandidateFormIdQuery,
  useUpdateTimerMutation,
  useAddSubmissionMutation,
  useEditSubmissionMutation,
  useGetCandidateSubmissionQuery
} = candidateSlice;
