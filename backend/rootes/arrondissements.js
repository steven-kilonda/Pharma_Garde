import express from "express";
import {
  getAllArrondissements,
  createArrondissement,
  getArrondissement,
  updateArrondissement,
  deleteArrondissement,
} from "../controllers/arrondissements.js";

const router = express.Router();

router.get("/", getAllArrondissements);

router.post("/", createArrondissement);

router.get("/:id", getArrondissement);

router.put("/:id", updateArrondissement);

router.delete("/:id", deleteArrondissement);

export default router;
