import {
  Box,
  Typography,
  Card,
  Divider,
  CardContent,
  List,
  ListItem,
  Button,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import PhoneAndroidOutlinedIcon from "@mui/icons-material/PhoneAndroidOutlined";
import DesktopWindowsOutlinedIcon from "@mui/icons-material/DesktopWindowsOutlined";
import { useEffect, useState } from "react";
import {
  getActiveDevices,
  logoutFromAllDevices,
  logoutSpecificDevice,
} from "../Services/adminService";
 
const ActiveSessionsPage = () => {
  const [loggedInSessions, setLoggedInSessions] = useState<any[]>([]);
 
  const fetchActiveDevices = async () => {
    try {
      const devices = await getActiveDevices();
      setLoggedInSessions(devices);
    } catch (error) {
      console.error("Error fetching active devices:", error);
    }
  };
 
  useEffect(() => {
    fetchActiveDevices();
  }, []);
 
  const handleLogoutSession = async (sessionId: string) => {
    try {
      await logoutSpecificDevice(sessionId);
      await fetchActiveDevices();
    } catch (e) {
      console.error("Failed to terminate session:", e);
    }
  };
 
  const handleLogoutAllSessions = async () => {
    try {
      await logoutFromAllDevices(true);
      await fetchActiveDevices();
    } catch (e) {
      console.error("Failed to terminate session:", e);
    }
  };
 
  const sortedSessions = [...loggedInSessions].sort((a, b) => {
    if (a.isCurrentSession) return -1;
    if (b.isCurrentSession) return 1;
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    return 0;
  });
 
  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
      <Card sx={{ width: "100%", borderRadius: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 2,
            pt: 2,
            mb:2
          }}
        >
          <Typography variant="h6">Active Sessions</Typography>
          <Button
            color="error"
            sx={{ fontWeight: "bold" }}
            onClick={handleLogoutAllSessions}
          >
            Logout All Devices
          </Button>
        </Box>
        <Divider />
        <CardContent sx={{ height: 650, overflowY: "auto" }}>
          <List>
  {sortedSessions.map((session, index) => (
    <Box key={session.id}>
      <ListItem sx={{ alignItems: "flex-start" }}>
        <ListItemIcon
          sx={{
            mt: { xs: "6px", sm: "12px" },
          }}
        >
          {(session.os === "Android" || session.os === "iOS") &&
          session.deviceType === "mobile" ? (
            <PhoneAndroidOutlinedIcon
              color={session.isCurrentSession ? "success" : "action"}
            />
          ) : (
            <DesktopWindowsOutlinedIcon
              color={session.isCurrentSession ? "success" : "action"}
            />
          )}
        </ListItemIcon>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            width: "100%",
            gap: 1,
          }}
        >
          <ListItemText
            primary={`${session.deviceType} (${session.os})`}
            secondary={`Browser: ${session.browser} | LoggedIn: ${new Date(
              session.expiresAt
            ).toLocaleString()}`}
            sx={{ wordBreak: "break-word" }}
          />
          <Box
            sx={{
              minWidth: { xs: "100%", sm: "auto" },
              textAlign: { xs: "left", sm: "right" },
            }}
          >
            {session.isCurrentSession ? (
              <Typography
                variant="caption"
                color="success.main"
                sx={{ fontWeight: "bold" }}
              >
                Current Session
              </Typography>
            ) : (
              <Button
                color="error"
                size="small"
                variant="text"
                onClick={() => handleLogoutSession(session.id)}
                disableElevation
                disableFocusRipple
                disableTouchRipple
                sx={{ fontWeight: "bold"
            ,mt: { xs: "6px", sm: "12px" },
          }}
              >
                Terminate
              </Button>
            )}
          </Box>
        </Box>
      </ListItem>
      {index !== sortedSessions.length - 1 && <Divider sx={{ my: 1 }} />}
    </Box>
  ))}
</List>

        </CardContent>
      </Card>
    </Box>
  );
};
 
export default ActiveSessionsPage;
 