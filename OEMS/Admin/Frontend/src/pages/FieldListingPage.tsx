import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
} from "@mui/material";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useEffect, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import { DataGridPro, GridColDef, GridRowsProp } from "@mui/x-data-grid-pro";
import { GridRowOrderChangeParams } from "@mui/x-data-grid-pro";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import LongMenu from "../components/LogMenu";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { Field, useGetFieldsByFormIdQuery } from "../modules/form_slice";
import { useParams } from "react-router-dom";
import { v4 as uuid } from "uuid";
import {
  useAddFieldMutation,
  useEditFieldMutation,
  useDeleteFieldMutation,
} from "../modules/form_slice";

type Option = {
  value: string;
};
type Question = {
  question: string;
};

type FormValues = {
  type: string;
  label: string;
  placeholder: string;
  textArea: string;
  options: Option[];
  questions: Question[];
  rta: any;
};

const FieldListingPage = () => {
  const Logoptions: string[] = ["edit", "delete"];
  const [addField] = useAddFieldMutation();
  const [editField] = useEditFieldMutation();
  const [deleteField] = useDeleteFieldMutation();

  const columns: GridColDef[] = [
    { field: "label", headerName: "Label", width: 1100 },
    { field: "type", headerName: "Field Type", width: 150 },
    {
      field: "actions",
      headerName: "",
      width: 150,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: "center",
      renderCell: (params) => (
        <LongMenu
          handleEdit={() => handleEdit(params.row)}
          handleDelete={() => handleDelete(params.row.fieldId)}
          Logoptions={Logoptions}
        />
      ),
    },
  ];

  const handleCreate = () => {
    reset({
      type: "",
      label: "",
      placeholder: "",
      textArea: "",
      options: [{ value: "" }],
      questions: [{ question: "" }],
      rta: "",
    });
    setEditId("");
    setOpen(true);
  };

  const [editId, setEditId] = useState<string>("");

  const handleEdit = (row: any) => {
    reset({
      type: row.type,
      label: row.label,
      placeholder: row.placeholder || "",
      textArea: row.fieldType === "textArea" ? row.textArea || "" : "",
      options:
        row.fieldType === "radio"
          ? row.options?.map((value: string) => ({ value })) || [{ value: "" }]
          : [{ value: "" }],
      rta: row.fieldType === "rta" ? row.rta.content : "",
      questions:
        row.fieldType === "rta"
          ? row.rta.questions.map((q: string) => ({ question: q }))
          : [{ question: "" }],
    });
    setEditId(row.fieldId);
    setOpen(true);
  };

  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<GridRowsProp>([]);
  const { formId } = useParams();
  console.log("edit", editId);
  const { data } = useGetFieldsByFormIdQuery(formId!);
  useEffect(() => {
    if (data) {
      setRows(data);
    }
  }, [data]);

  const handleDelete = async (id: string) => {
    try {
      await deleteField({
        formId: formId!,
        fieldId: id,
      });
      const updatedRows = rows.filter((row) => row.id !== id);
      setRows(updatedRows);
    } catch (error) {
      console.error("Error deleting field", error);
    }
  };

  const { register, handleSubmit, reset, watch, control } = useForm<FormValues>(
    {
      defaultValues: {
        options: [{ value: "" }],
        questions: [{ question: "" }],
      },
    }
  );

  const { fields, append, remove } = useFieldArray({
    control,
    name: "options",
  });

  const {
    fields: rtaFields,
    append: appendRta,
    remove: removeRta,
    replace: replaceRta,
  } = useFieldArray({
    control,
    name: "questions",
  });

  const selectedType = watch("type");

  const onSubmit = async (data: FormValues) => {
    const baseField: Field = {
      fieldId: editId || uuid(),
      label: data.label || "—",
      placeholder: data.placeholder || "-",
      type: data.type,
      options:
        data.type === "radio"
          ? data.options.map((o) => o.value.trim()).filter(Boolean)
          : undefined,
      rta:
        data.type === "rta"
          ? {
              content: data.rta,
              questions: data.questions
                .map((q) => q.question.trim())
                .filter(Boolean),
            }
          : undefined,
    };

    try {
      if (editId) {
        await editField({ formId: formId!, data: baseField }).unwrap();
      } else {
        await addField({ formId: formId!, data: baseField }).unwrap();
      }
      setOpen(false);
      reset();
      setEditId("");
    } catch (error) {
      console.error("Error submitting field", error);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", marginTop: "30px" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          background: "white",
          border: "1px solid lightGray",
          padding: "20px",
          alignItems: "center",
          borderRadius: "10px",
        }}
      >
        <Typography sx={{ fontWeight: "bold" }}>Form Builder</Typography>
        <Button variant="contained" disableElevation onClick={handleCreate}>
          Create Field
        </Button>
      </Box>
      <Box sx={{ marginTop: "30px", height: "630px" }}>
        <DataGridPro
          columns={columns}
          rows={rows}
          slots={{
            rowReorderIcon: () => <SwapVertIcon />,
          }}
          rowReordering
          onRowOrderChange={(params: GridRowOrderChangeParams) => {
            const draggedRow = params.row;
            const targetIndex = params.targetIndex;
            const currentIndex = rows.findIndex((r) => r.id === draggedRow.id);
            if (currentIndex === -1 || targetIndex === -1) return;
            const updatedRows = [...rows];
            updatedRows.splice(currentIndex, 1);
            updatedRows.splice(targetIndex, 0, draggedRow);
            setRows(updatedRows);
            localStorage.setItem("formFields", JSON.stringify(updatedRows));
          }}
          disableRowSelectionOnClick
        />
      </Box>

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
          setEditId("");
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ marginBottom: "10px", fontWeight: "bold" }}>
          {editId ? "Edit Field" : "Create Field"}
        </DialogTitle>

        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              disabled={editId ? true : false}
              select
              label="Type"
              fullWidth
              sx={{ marginTop: "10px" }}
              value={watch("type")}
              {...register("type")}
            >
              <MenuItem value="text">Text</MenuItem>
              <MenuItem value="textArea">Text Area</MenuItem>
              <MenuItem value="radio">Radio</MenuItem>
              <MenuItem value="rta">Rich Text Area</MenuItem>
            </TextField>

            <TextField label="Label" fullWidth {...register("label")} />

            {selectedType === "text" && (
              <TextField
                label="Placeholder"
                fullWidth
                {...register("placeholder")}
              />
            )}

            {selectedType === "rta" && (
              <Box>
                <Controller
                  control={control}
                  name="rta"
                  defaultValue=""
                  render={({ field: { onChange, value } }) => (
                    <CKEditor
                      editor={ClassicEditor as any}
                      data={value}
                      onChange={(_, editor) => {
                        const data = editor.getData();
                        onChange(data);
                      }}
                    />
                  )}
                />

                <Typography sx={{ mt: 2, mb: 1, fontWeight: "bold" }}>
                  Questions
                </Typography>
                {rtaFields.map((field, index) => (
                  <Box
                    key={field.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <TextField
                      label={`Question ${index + 1}`}
                      fullWidth
                      {...register(`questions.${index}.question` as const)}
                    />
                    <IconButton
                      onClick={() => removeRta(index)}
                      color="error"
                      disabled={rtaFields.length === 1}
                    >
                      <RemoveCircleOutlineIcon />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  variant="contained"
                  size="small"
                  color="success"
                  startIcon={<AddIcon />}
                  onClick={() => appendRta({ question: "" })}
                  sx={{ mt: 1, mr: 1 }}
                >
                  Add Question
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  color="error"
                  onClick={() => replaceRta([{ question: "" }])}
                  sx={{ mt: 1 }}
                >
                  Reset Questions
                </Button>
              </Box>
            )}

            {selectedType === "radio" && (
              <Box>
                <Typography sx={{ mt: 2, mb: 1, fontWeight: "bold" }}>
                  Options
                </Typography>
                {fields.map((field, index) => (
                  <Box
                    key={field.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <TextField
                      label={`Option ${index + 1}`}
                      fullWidth
                      {...register(`options.${index}.value` as const)}
                    />
                    <IconButton
                      onClick={() => remove(index)}
                      color="error"
                      disabled={fields.length === 1}
                    >
                      <RemoveCircleOutlineIcon />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  variant="contained"
                  size="small"
                  color="success"
                  startIcon={<AddIcon />}
                  onClick={() => append({ value: "" })}
                  sx={{ mt: 1, mr: 1 }}
                >
                  Add Option
                </Button>
              </Box>
            )}
          </DialogContent>

          <DialogActions sx={{ padding: "20px" }}>
            <Button
              onClick={() => {
                setOpen(false);
                reset();
                setEditId("");
              }}
              color="error"
              variant="outlined"
            >
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary">
              {editId ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default FieldListingPage;
