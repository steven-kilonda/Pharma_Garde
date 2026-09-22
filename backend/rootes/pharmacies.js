import express from "express";
import {
  getAllPharmacies,
  createPharmacie,
  getPharmacie,
  updatePharmacie,
  deletePharmacie,
} from "../controllers/pharmacies.js";

const router = express.Router();

router.get("/", getAllPharmacies);

router.post("/", createPharmacie);

router.get("/:id", getPharmacie);

router.put("/:id", updatePharmacie);

router.delete("/:id", deletePharmacie);

export default router;
