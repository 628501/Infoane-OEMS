import { Box, Button, Typography } from "@mui/material";
import { DataGridPro, GridColDef} from "@mui/x-data-grid-pro";
 
import LongMenu from "../components/LogMenu";
import { useGetSubmissionsByFormIdQuery } from "../modules/admin_slice";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { GridRowsProp } from "@mui/x-data-grid";
const SubmissionsPage = () => {
  const Logoptions: string[] = ["edit", "delete"];
  const {id:formId} = useParams();
  
  const columns: GridColDef[] = [
    { field: "userEmail", headerName: "Email", width: 300 },
    { field: "startTime", headerName: "Start Time", width: 100 },
    { field: "submittedAt", headerName: "End Time", width: 100 },
    { field: "duration", headerName: "Duration", width: 100 },
    { field: "status", headerName: "Status", width: 200 },
    { field: "warning", headerName: "Warning", width: 100 },
    { field: "score", headerName: "Score", width: 100 ,
      editable:true,
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
  const {data: submissionData}= useGetSubmissionsByFormIdQuery(formId ?? "");
  
  useEffect(()=>{
    if(submissionData){
      setRows(submissionData)
    }
  },[submissionData])
  const [rows, setRows] = useState<GridRowsProp>([]);

 
  const handleDelete = (row: any) => {};
 
  const handleEdit = (row: any) => {
    console.log("Edit action for row:", row);
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
        <Button variant="contained" disableElevation>Download</Button>
      </Box>
      <Box sx={{ marginTop: "30px", height: "630px" }}>
        <DataGridPro columns={columns} rows={rows} />
      </Box>
    </Box>
  );
};
 
export default SubmissionsPage;