import { Box, Button, Typography } from "@mui/material";
import { DataGridPro, GridColDef, GridRowsProp } from "@mui/x-data-grid-pro";
import LongMenu from "../components/LogMenu";
import {
  useGetSubmissionsByFormIdQuery,
  useUpdateSubmissionMutation,
} from "../modules/admin_slice";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

const SubmissionsPage = () => {
  const Logoptions: string[] = ["edit", "delete"];
  const { id: formId } = useParams();
  const [editSubmission] = useUpdateSubmissionMutation();
  const [rows, setRows] = useState<GridRowsProp>([]);

  const columns: GridColDef[] = [
    { field: "userEmail", headerName: "Email", width: 350 },
    { field: "startTime", headerName: "Start Time", width: 150 },
    { field: "endTime", headerName: "End Time", width: 150 },
    { field: "duration", headerName: "Duration", width: 150 },
    { field: "status", headerName: "Status", width: 150 },
    { field: "warning", headerName: "Warnings", width: 150 },
    {
      field: "score",
      headerName: "Score",
      width: 150,
      editable: true,
    },
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
          handleDelete={() => handleDelete(params.row)}
          Logoptions={Logoptions}
        />
      ),
    },
  ];

  const { data: submissionData } = useGetSubmissionsByFormIdQuery(formId ?? "");

  useEffect(() => {
    if (submissionData) {
      setRows(submissionData);
    }
  }, [submissionData]);

  const handleEdit = (row: any) => {
    console.log("Edit action for row:", row);
  };

  const handleDelete = (row: any) => {
    console.log("Delete action for row:", row);
  };

  const handleProcessRowUpdate = async (updatedRow: any) => {
    try {
      await editSubmission({
        formId: formId!,
        userEmail: updatedRow.userEmail,
        ...updatedRow,
      });
      return updatedRow;
    } catch (err) {
      console.error("Update failed:", err);
      return updatedRow;
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
        <Typography sx={{ fontWeight: "bold" }}>Submissions</Typography>
        <Button
          variant="text"
          disableElevation
          disableRipple
          sx={{ color: "white", background: "white", cursor: "default" }}
        >
          Download
        </Button>
      </Box>

      <Box sx={{ marginTop: "30px", height: "630px" }}>
        <DataGridPro
          columns={columns}
          rows={rows}
          checkboxSelection
          processRowUpdate={handleProcessRowUpdate}
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
      </Box>
    </Box>
  );
};

export default SubmissionsPage;
