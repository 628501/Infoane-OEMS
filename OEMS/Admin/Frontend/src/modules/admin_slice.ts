import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';

export interface Field {
  fieldId: string;
  type?: string;
  label: string;
  placeholder?: string;
  options?: any;
  rta?: any;
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
export interface Form {
  formId: string;
  label: string;
  manager: string;
  description?: string;
  duration: string;
  status?: string;
  startContent?: string;
  endContent?: string;
}

type RefreshResponse = {
  accessToken: string;
};

const baseQuery = fetchBaseQuery({
  baseUrl: 'http://localhost:5000/api/mock_form',
  credentials: 'include',
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('accessToken');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<any, unknown, unknown> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {

    const refreshResult = await baseQuery(
      { url: 'form/refresh-token', method: 'POST' },
      api,
      extraOptions
    );

    if (refreshResult.data) {
      const newAccessToken = (refreshResult.data as RefreshResponse).accessToken;
      localStorage.setItem('accessToken', newAccessToken);

      const retryHeaders = new Headers();
      retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);

      const retryArgs = typeof args === 'string' ? { url: args } : { ...args };
      retryArgs.headers = retryHeaders;

      result = await baseQuery(retryArgs, api, extraOptions);
    } else {
      window.location.href = "/";
      console.error('Token refresh failed');
    }
  }

  return result;
};

export const formSlice = createApi({
  reducerPath: 'form_api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Forms', 'Fields', 'Submissions'],
  endpoints: (builder) => ({
    getForms: builder.query<Form[], void>({
      query: () => 'forms',
      providesTags: ['Forms'],
    }),

    addForm: builder.mutation<{ message: string; formId: string }, Omit<Form, 'createdAt'>>({
      query: (formData) => ({
        url: 'form',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Forms'],
    }),

    updateForm: builder.mutation<{ message: string }, { data: Omit<Form, 'createdAt'> }>({
      query: ({ data }) => ({
        url: `form/${data.formId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Forms'],
    }),

    deleteForm: builder.mutation<{ message: string }, string>({
      query: (formId) => ({
        url: `form/${formId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Forms'],
    }),

    getFieldsByFormId: builder.query<Field[], string>({
      query: (formId) => `form/${formId}/fields`,
      providesTags: (_result, _error, formId) => [{ type: 'Fields', id: formId }],
    }),

    addField: builder.mutation<{ message: string; fieldId: string }, { formId: string; data: Field }>({
      query: ({ formId, data }) => ({
        url: `form/${formId}/field`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { formId }) => [{ type: 'Fields', id: formId }],
    }),

    editField: builder.mutation<Field, { formId: string; data: Field }>({
      query: ({ formId, data }) => ({
        url: `form/${formId}/field/${data.fieldId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { formId }) => [{ type: 'Fields', id: formId }],
    }),

    deleteField: builder.mutation<void, { formId: string; fieldId: string }>({
      query: ({ formId, fieldId }) => ({
        url: `form/${formId}/field/${fieldId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { formId }) => [{ type: 'Fields', id: formId }],
    }),

    getSubmissionsByFormId: builder.query<Submission[], string>({
      query: (formId) => `form/${formId}/submissions`,
      providesTags: (_result, _error, formId) => [{ type: 'Submissions', id: formId }],
    }),

     getSubmittedCount: builder.query<{ submittedCount: number }, string>({
          query: (formId) => `form/${formId}/submitted-count`,
          providesTags: (_result, _error, formId) => [{ type: "Submissions", id: formId }],
        }),
    
    replaceFields: builder.mutation<{ message: string }, { formId: string; fields: Field[] }>({
      query: ({ formId, fields }) => ({
        url: `form/${formId}/fields`,
        method: 'PUT',
        body: { fields },
      }),
      invalidatesTags: (_result, _error, { formId }) => [
        { type: 'Fields', id: formId },
      ],
    }),

    uploadImage: builder.mutation<{ imageUrl: string }, FormData>({
      query: (formData) => ({
        url: "/upload-image",
        method: "POST",
        body: formData,
      }),
    }),
  }),
});

export const {
  useGetFormsQuery,
  useAddFormMutation,
  useUpdateFormMutation,
  useDeleteFormMutation,
  useGetFieldsByFormIdQuery,
  useAddFieldMutation,
  useEditFieldMutation,
  useDeleteFieldMutation,
  useGetSubmissionsByFormIdQuery,
  useLazyGetSubmittedCountQuery,
  useReplaceFieldsMutation,
  useUploadImageMutation
} = formSlice;