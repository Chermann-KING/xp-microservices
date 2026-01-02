import express from "express";
import {
  getAllTours,
  getTourById,
  createTour,
  updateTour,
  patchTour,
  deleteTour,
} from "../controllers/tourController.js";

const router = express.Router();

router.get("/", getAllTours);
router.get("/:tourId", getTourById);
router.post("/", createTour);
router.put("/:tourId", updateTour);
router.patch("/:tourId", patchTour);
router.delete("/:tourId", deleteTour);

export default router;
