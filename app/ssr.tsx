import { createClerkHandler } from "@clerk/tanstack-react-start/server";
import { startInstance } from "./start";

export default createClerkHandler(startInstance);
