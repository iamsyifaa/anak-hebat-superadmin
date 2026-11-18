import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { School, CreateSchoolInput } from "@/lib/types/schoolType";
import {
  getSchoolListApi,
  storeSchoolApi,
  updateSchoolNameApi,
  type ListParams,
} from "@/lib/api/schoolApi";

interface SchoolState {
  schools: School[];
  totalData: number;
  loading: boolean;
  error: string | null;
}

const initialState: SchoolState = {
  schools: [],
  totalData: 0,
  loading: false,
  error: null,
};

// Gagal request = thunk rejected dengan pesan dari error.message backend.
export const getSchoolList = createAsyncThunk(
  "school/getSchoolList",
  (params: ListParams) => getSchoolListApi(params),
);

export const storeSchool = createAsyncThunk(
  "school/storeSchool",
  (input: CreateSchoolInput) => storeSchoolApi(input),
);

// PATCH /schools/{id}: hanya nama. Tidak ada hapus sekolah.
export const updateSchoolName = createAsyncThunk(
  "school/updateSchoolName",
  ({ id, name }: { id: string; name: string }) => updateSchoolNameApi(id, name),
);

const schoolSlice = createSlice({
  name: "school",
  initialState,
  reducers: {
    clearSchoolMessage: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getSchoolList.pending, (state) => {
        state.loading = true;
      })
      .addCase(getSchoolList.fulfilled, (state, action) => {
        state.loading = false;
        state.schools = action.payload.data ?? [];
        state.totalData = action.payload.meta?.total ?? state.schools.length;
      })
      .addCase(getSchoolList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Gagal memuat daftar sekolah.";
      })
      .addCase(storeSchool.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(storeSchool.fulfilled, (state) => {
        // Daftar dimuat ulang oleh tabel (refresh) supaya urutan & halaman
        // mengikuti server.
        state.loading = false;
      })
      .addCase(storeSchool.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Gagal menambahkan sekolah.";
      })
      .addCase(updateSchoolName.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSchoolName.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateSchoolName.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Gagal memperbarui sekolah.";
      });
  },
});

export const { clearSchoolMessage } = schoolSlice.actions;
export default schoolSlice.reducer;
