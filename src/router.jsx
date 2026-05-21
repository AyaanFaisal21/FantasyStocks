import { createBrowserRouter } from "react-router-dom";
import StockLookup from "./Components/StockLookup";
import Signup from "./Components/Signup";
import Signin from "./Components/Signin";
import Dashboard from "./Components/Dashboard";
import PrivateRoute from "./Components/PrivateRoute";
import CreateProfile from "./Components/CreateProfile";
import Landing from "./Components/Landing";
import LeaguePage from "./Components/LeaguePage";
import LeaderboardPage from "./Components/LeaderboardPage";
import AddDropStock from "./Components/AddDropStock";
import MatchupPage from "./Components/matchupPage";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <Landing />,
    },
    {
        path: "/signup",
        element: <Signup />,
    },
    {
        path: "/signin",
        element: <Signin />,
    },
    {
        path: "/dashboard",
        element: <PrivateRoute><Dashboard /> </PrivateRoute>,
    },
    { 
        path: "/create-profile", 
        element: <PrivateRoute><CreateProfile /></PrivateRoute>,
    },
    {
        path: "/test-stock-lookup", 
        element: <StockLookup />
    },
    {
        path: "/league/:leagueId",
        element: <PrivateRoute><LeaguePage /></PrivateRoute>
    },



]);