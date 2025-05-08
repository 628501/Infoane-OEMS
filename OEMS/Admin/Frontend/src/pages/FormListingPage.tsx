import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  Tooltip,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DataTable from "../components/DataTable";
import { GridColDef } from "@mui/x-data-grid";
import LongMenu from "../components/LogMenu";
import { useAuth } from "../context/GlobalContext";
import {
  useAddFormMutation,
  useUpdateFormMutation,
  useDeleteFormMutation,
  useGetFormsQuery,
} from "../modules/admin_slice";
import { v4 as uuid } from "uuid";
import DeleteFormDialog from "../components/DeleteFormDialog";
import { toast } from "react-toastify";
import { useLazyGetSubmittedCountQuery } from "../modules/admin_slice";

type FormValues = {
  label: string;
  description: string;
  startContent: string;
  endContent: string;
  duration: string;
  manager: string;
};

const FormListingPage = () => {
  const [updateForm] = useUpdateFormMutation();
  const [deleteForm] = useDeleteFormMutation();
  const { data, isLoading } = useGetFormsQuery();
  const [editId, setEditId] = useState<string | null>(null);
  const [addForm] = useAddFormMutation();
  const [open, setOpen] = useState(false);
  const [formRows, setFormRows] = useState<any[]>([]);
  const { name } = useAuth();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<any>(null);

  const { register, handleSubmit, reset } = useForm<FormValues>();
  const [triggerGetSubmittedCount] = useLazyGetSubmittedCountQuery();

  useEffect(() => {
    if (data) {
      const fetchSubmissionCounts = async () => {
        const rowsWithCounts = await Promise.all(
          data.map(async (form) => {
            try {
              const response = await triggerGetSubmittedCount(
                form.formId
              ).unwrap();
              return {
                ...form,
                submissions: response.submittedCount ?? 0,
              };
            } catch (err: any) {
              console.log(err);

              return {
                ...form,
                submissions: 0,
              };
            }
          })
        );
        setFormRows(rowsWithCounts);
      };

      fetchSubmissionCounts();
    }
  }, [data, triggerGetSubmittedCount]);

  const Logoptions: string[] = [
    "edit",
    "delete",
    "copy test url",
    "view Submissions",
  ];
  const columns: GridColDef[] = [
    { field: "label", headerName: "Form Name", width: 250 },
    { field: "description", headerName: "Description", width: 250 },
    { field: "submissions", headerName: "Submissions", width: 200 },
    { field: "duration", headerName: "Duration (In mins)", width: 200 },
    { field: "manager", headerName: "Manager", width: 250 },
    {
      field: "status",
      headerName: "Status",
      width: 100,
      renderCell: (params) => (
        <Tooltip title="Active / Inactive">
          <Box onClick={(event) => event.stopPropagation()}>
            <Switch
              color="success"
              checked={params.row.status === "active"}
              onChange={() => handleToggleStatus(params.row)}
            />
          </Box>
        </Tooltip>
      ),
    },
    {
      field: "actions",
      headerName: "",
      width: 200,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: "center",
      renderCell: (params) => (
        <Box
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <LongMenu
            handleDelete={() => handleDeleteClick(params.row)}
            handleEdit={() => handleEdit(params.row)}
            handleCopyUrl={() => handleCopyUrl(params.row)}
            handleViewSubmissions={() => handleViewSubmissions(params.row)}
            Logoptions={Logoptions}
          />
        </Box>
      ),
    },
  ];

  const handleDeleteClick = (row: any) => {
    setSelectedForm(row);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async (row: any) => {
    try {
      await deleteForm(row.formId).unwrap();
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error("Failed to delete form:", err);
    }
  };
  const handleViewSubmissions = async (row: any) => {
    navigate(`submissions-page/${row.formId} `);
  };

  const handleToggleStatus = async (row: any) => {
    const updatedRow = {
      ...row,
      status: row.status === "active" ? "inactive" : "active",
    };
    try {
      await updateForm({ data: updatedRow }).unwrap();
      setFormRows((prevRows) =>
        prevRows.map((form) => (form.formId === row.formId ? updatedRow : form))
      );
    } catch (err) {
      console.error("Failed to update form status:", err);
      toast.error("Status update failed");
    }
  };

  const handleEdit = (row: any) => {
    setEditId(row.formId);
    reset({
      label: row.label,
      description: row.description,
      startContent: row.startContent,
      endContent: row.endContent,
      duration: row.duration,
      manager: row.manager,
    });
    setOpen(true);
  };

  const onSubmit = async (formData: FormValues) => {
    if (editId) {
      const currentForm = formRows.find((form) => form.formId === editId);
      const updatedForm = {
        formId: editId,
        ...formData,
        status: currentForm?.status || "inactive",
      };
      try {
        await updateForm({ data: updatedForm }).unwrap();
        setEditId(null);
      } catch (err) {
        console.error("Failed to update form:", err);
      }
    } else {
      const newForm = {
        formId: uuid(),
        label: formData.label,
        description: formData.description,
        startContent: formData.startContent,
        endContent: formData.endContent,
        duration: formData.duration,
        manager: name ?? "",
        status: "inactive",
      };
      try {
        await addForm(newForm).unwrap();
      } catch (err) {
        console.error("Failed to add form:", err);
      }
    }

    setOpen(false);

    reset();
  };

  const handleCopyUrl = (row: any) => {
    const url = `http://localhost:5173/candidate-login/${row.formId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied successfully!");
  };

  const handleRowClick = (row: any) => {
    navigate(`/field-listing-page/${row.label}/${row.formId}`);
  };

  const handleCreate = () => {
    reset({
      label: "",
      description: "",
      startContent: "",
      endContent: "",
      duration: "",
      manager: "",
    });
    setEditId(null);
    reset();
    setOpen(true);
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
        <Typography sx={{ fontWeight: "bold" }}>Form Manager</Typography>
        <Button
          variant="contained"
          disableElevation
          onClick={() => handleCreate()}
        >
          Create Form
        </Button>
      </Box>

      <Box sx={{ marginTop: "30px" }}>
        {isLoading ? (
          <Typography>Loading...</Typography>
        ) : (
          <DataTable
            columns={columns}
            rows={formRows}
            onRowClick={(params: any) => handleRowClick(params.row)}
          />
        )}
      </Box>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>
          {editId ? "Edit Form" : "Create Form"}
        </DialogTitle>

        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <TextField
              label="Form Name"
              {...register("label", { required: true })}
              fullWidth
            />
            <TextField
              label="Description"
              {...register("description", { required: true })}
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              label="Start Content"
              {...register("startContent", { required: true })}
              fullWidth
              multiline
              rows={10}
            />
            <TextField
              label="End Content"
              {...register("endContent", { required: true })}
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              label="Duration"
              {...register("duration", { required: true })}
              placeholder="In Minutes"
              required
              fullWidth
            />
          </DialogContent>

          <DialogActions sx={{ padding: "30px" }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disableElevation>
              {editId ? "Edit Form" : "Create Form"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <DeleteFormDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedForm(null);
        }}
        selectedForm={selectedForm}
        onDelete={() => handleDelete(selectedForm)}
      />
    </Box>
  );
};

export default FormListingPage;
