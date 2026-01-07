import express from "express";
import {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
  updatePaymentStatus,
  cancelBooking,
  deleteBooking,
} from "../controllers/booking.controller.js";

const router = express.Router();

router.get("/", getAllBookings);
router.get("/:bookingId", getBookingById);
router.post("/", createBooking);
router.patch("/:bookingId/status", updateBookingStatus);
router.patch("/:bookingId/payment-status", updatePaymentStatus);
router.post("/:bookingId/cancel", cancelBooking);
router.delete("/:bookingId", deleteBooking);

export default router;
