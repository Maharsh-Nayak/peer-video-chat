import { Router } from "express";
import {login, register} from "../controler/user.js";

const router= Router();

router.route("/home");
router.route("/login").post(login);
router.route("/register").post(register);
router.route("/logout");
router.route("/profile");
router.route("/update-profile");
router.route("/delete-account");
router.route("/forgot-password");
router.route("/reset-password");


export default router;
