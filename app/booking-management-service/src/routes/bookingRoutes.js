import express from "express";
import {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
  cancelBooking,
  deleteBooking,
} from "../controllers/bookingController.js";

const router = express.Router();

router.get("/", getAllBookings);
router.get("/:bookingId", getBookingById);
router.post("/", createBooking);
router.patch("/:bookingId/status", updateBookingStatus);
router.post("/:bookingId/cancel", cancelBooking);
router.delete("/:bookingId", deleteBooking);

export default router;
