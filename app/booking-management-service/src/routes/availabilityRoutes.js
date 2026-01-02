import express from "express";
import { checkAvailability } from "../controllers/availabilityController.js";

const router = express.Router();

router.get("/", checkAvailability);

export default router;
