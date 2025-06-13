import {
  Box,
  Button,
  Paper,
  Typography,
  Tooltip,
} from "@mui/material";
import {
  DataGridPro,
  GridColDef,
  useGridApiRef,
  GridFilterModel,
} from "@mui/x-data-grid-pro";
import { toast } from "react-toastify";
import { Candidate } from "../Services/adminService";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  useDeleteSelectedCandidateByEmailMutation,
  useGetSelectedCandidatesByFormIdQuery,
} from "../modules/admin_slice";
import LongMenu from "../components/LogMenu";
import DeleteIcon from "@mui/icons-material/Delete";

export default function EligibleExaminees() {
  const Logoptions: string[] = ["Delete"];

  const columns: GridColDef[] = [
    { field: "name", headerName: "Name", width: 150 },
    { field: "email", headerName: "Email", width: 250 },
    { field: "mobile", headerName: "Mobile", width: 110 },
    { field: "degree", headerName: "Degree", width: 100 },
    { field: "department", headerName: "Department", width: 150 },
    {
      field: "degree_percentage",
      headerName: "Degree %",
      type: "number",
      width: 100,
    },
    {
      field: "sslc_percentage",
      headerName: "SSLC %",
      type: "number",
      width: 100,
    },
    {
      field: "hsc_percentage",
      headerName: "HSC %",
      type: "number",
      width: 100,
    },
    { field: "location", headerName: "Location", width: 120 },
    { field: "relocate", headerName: "Relocate?", width: 100 },
    {
      field: "actions",
      headerName: "",
      width: 100,
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
            handleDelete={() => handleDelete(params.row)}
            Logoptions={Logoptions}
          />
        </Box>
      ),
    },
  ];
  const apiRef = useGridApiRef();
  const { testId: formId } = useParams();
  
  const [deleteEligibleExaminees] = useDeleteSelectedCandidateByEmailMutation();
  const { data: EligibleExaminees } = useGetSelectedCandidatesByFormIdQuery(formId ?? "");
  
  const [rows, setRows] = useState<Candidate[]>([]);

  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  const [filterModel, setFilterModel] = useState<GridFilterModel>({
    items: [],
  });

  useEffect(() => {
  if (EligibleExaminees) {
    setRows(EligibleExaminees.candidates);
  }
}, [EligibleExaminees]);

const handleDelete = async (row:any) => {
  console.log(row);
  
await deleteEligibleExaminees({
      formId: formId ?? "",
      email: row.email ?? "",
    });
}
  const handleDeleteSelected = async () => {
      const selectedIDs = apiRef?.current?.getSelectedRows();
      const selectedRows = Array.from(selectedIDs!.values());
      if (selectedRows.length === 0) {
        toast.error("Please select at least one row.");
        return;
      }
      const emails = selectedRows.flatMap(row => row.email ? [row.email] : []);

      try {
          await deleteEligibleExaminees({
            formId: formId ?? "",
            email: emails ?? "",
          });

        toast.success(`Deleted ${selectedRows.length} candidate(s).`);
      } catch (error) {
        toast.error("Failed to delete selected candidates.");
      }
    };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", marginTop: "30px" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: {sm: "row" },
          justifyContent: "space-between",
          background: "white",
          border: "1px solid lightGray",
          padding: "20px",
          alignItems: "center",
          borderRadius: "10px",
        }}
      >
        <Typography
          sx={{ fontWeight: "bold", marginBottom: { xs: "10px", xl: "0px" } }}
        >
          Eligible Examinees
        </Typography>
        <Box sx={{ display: "flex", gap: 3 }}>
          <Tooltip title="Delete selected Examinees">
            <Button
              disableElevation
              variant="contained"
              color="error"
              onClick={()=> handleDeleteSelected()}
              startIcon={<DeleteIcon />}
            >
              Delete
            </Button>
          </Tooltip>
        </Box>
      </Box>
      <Box sx={{ marginTop: "30px" }}>
        <Paper elevation={0} sx={{ borderRadius: 3 }}>
          <DataGridPro
            apiRef={apiRef}
            rows={rows}
            columns={columns}
            checkboxSelection
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50, 100]}
            filterModel={filterModel}
            onFilterModelChange={(model) => setFilterModel(model)}
            sx={{
              border: "1px solid lightgray",
              height: 631,
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "#f5f5f5",
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontWeight: "bold",
                fontSize: 14,
              },
              "& .MuiDataGrid-row:hover": {
                backgroundColor: "#f0f7ff",
              },
            }}
          />
        </Paper>
      </Box>
    </Box>
  );
}
