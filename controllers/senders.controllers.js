const db = require("../models");

exports.get_all_senders = async (req, res, next) => {
  try {
    const senders = await db.email_sender.findAll({
      //   attributes: {
      //     exclude: ["email_password"],
      //   },
    });
    res.status(200).json({
      success: true,
      data: senders,
    });
  } catch (error) {
    next(error);
  }
};

exports.add_sender = async (req, res, next) => {
  try {
    const { name, email, designation, address, phone, limit, password } =
      req.body;
    if (
      !name ||
      !email ||
      !password ||
      !designation ||
      !address ||
      !phone ||
      !limit
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const newSender = await db.email_sender.create({
      email_user: email,
      email_password: password,
      email_name: name,
      designation: designation,
      address: address,
      phone: phone,
      limit: limit,
    });

    res.status(200).json({
      success: true,
      data: newSender,
    });
  } catch (error) {
    next(error);
  }
};

exports.update_sender = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, password, designation, address, phone, limit } =
      req.body;

    if (!name || !email || !designation || !address || !phone || !limit) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Check if sender exists
    const sender = await db.email_sender.findByPk(id);
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: "Sender not found",
      });
    }

    // Update fields (password optional)
    sender.email_name = name;
    sender.email_user = email;
    if (password) {
      sender.email_password = password;
    }
    sender.designation = designation;
    sender.address = address;
    sender.phone = phone;
    sender.limit = limit;

    await sender.save();

    res.status(200).json({
      success: true,
      data: sender,
    });
  } catch (error) {
    next(error);
  }
};

exports.delete_sender = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if sender exists
    const sender = await db.email_sender.findByPk(id);
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: "Sender not found",
      });
    }

    // Delete the sender
    await sender.destroy();

    res.status(200).json({
      success: true,
      message: "Sender deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
