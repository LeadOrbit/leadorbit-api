// controllers/senderList.controller.js
const { SenderList, Sender } = require('../models');

exports.createList = async (req, res) => {
  try {
    const { name } = req.body;
    const exists = await SenderList.findOne({ where: { name } });
    if (exists) return res.status(400).json({ message: 'List already exists' });

    const list = await SenderList.create({ name });
    res.status(201).json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create list' });
  }
};

exports.getLists = async (req, res) => {
  try {
    const lists = await SenderList.findAll({
      include: { model: Sender, as: 'senders' },
    });
    res.json({ success: true, data: lists });
  } catch {
    res.status(500).json({ message: 'Failed to fetch lists' });
  }
};

exports.addSender = async (req, res) => {
  try {
    const { listName, email, limit } = req.body;
    const list = await SenderList.findOne({ where: { name: listName } });
    if (!list) return res.status(404).json({ message: 'List not found' });

    const exists = await Sender.findOne({ where: { senderListId: list.id, email } });
    if (exists) return res.status(400).json({ message: 'Sender already exists' });

    await Sender.create({ email, limit, senderListId: list.id });
    const updatedList = await SenderList.findByPk(list.id, {
      include: { model: Sender, as: 'senders' },
    });

    res.json({ success: true, data: updatedList });
  } catch {
    res.status(500).json({ message: 'Failed to add sender' });
  }
};

exports.deleteSender = async (req, res) => {
  try {
    const { listName, email } = req.body;
    const list = await SenderList.findOne({ where: { name: listName } });
    if (!list) return res.status(404).json({ message: 'List not found' });

    await Sender.destroy({ where: { senderListId: list.id, email } });

    const updatedList = await SenderList.findByPk(list.id, {
      include: { model: Sender, as: 'senders' },
    });

    res.json({ success: true, data: updatedList });
  } catch {
    res.status(500).json({ message: 'Failed to delete sender' });
  }
};
