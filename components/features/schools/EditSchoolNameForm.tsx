"use client";

import { SyntheticEvent, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import {
  clearSchoolMessage,
  updateSchoolName,
} from "@/redux/features/school/schoolSlice";
import { School } from "@/lib/types/schoolType";
import TextInput from "@/components/ui/Input/TextInput";
import PrimaryButton from "@/components/ui/Button/PrimaryButton";
import ErrorAlert from "@/components/ui/Alert/ErrorAlert";

interface Props {
  school: School;
  onSuccess: () => void;
}

// PATCH /schools/{id} hanya menerima name (nama unik). Alamat tidak bisa
// diubah dari sini.
function EditSchoolNameForm({ school, onSuccess }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.school);
  const [name, setName] = useState(school.name);

  useEffect(() => {
    dispatch(clearSchoolMessage());
  }, [dispatch]);

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();
    dispatch(clearSchoolMessage());
    const result = await dispatch(
      updateSchoolName({ id: school.id, name: name.trim() }),
    );
    if (updateSchoolName.fulfilled.match(result)) onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <ErrorAlert
          message={error}
          onClose={() => dispatch(clearSchoolMessage())}
        />
      )}
      <TextInput
        id="school-edit-name"
        name="name"
        label="Nama Sekolah"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <PrimaryButton
        type="submit"
        loading={loading}
        disabled={!name.trim() || name.trim() === school.name}
        label="Simpan Perubahan"
      />
    </form>
  );
}

export default EditSchoolNameForm;
