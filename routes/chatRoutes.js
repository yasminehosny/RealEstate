const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const Property = require("../models/propertySchema");
const User = require("../models/userSchema");
const Admin = require("../models/Admin");

const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

// ✅ صفحة شات العميل أو الأدمن مع المالك
router.get("/chat/:propertyId", async (req, res) => {
  const user = req.session.user;
  const admin = req.session.admin;

  if (!user && !admin) return res.redirect("/login");

  const property = await Property.findById(req.params.propertyId).populate("userID");
  if (!property) return res.status(404).send("العقار غير موجود");

  let receiverId = property.userID._id; // المالك هو المستقبل
  if (req.query.clientId) {
    receiverId = req.query.clientId; // لو المالك أو الأدمن اختار عميل
  }

  const currentUserId = user ? user._id : admin._id;

  let messages;

  if (admin) {
    // ✅ جلب الرسائل بين العميل والمالك فقط
    messages = await Message.find({
      property: property._id,
      $or: [
        { sender: receiverId, receiver: property.userID._id },
        { sender: property.userID._id, receiver: receiverId }
      ]
    }).sort({ timestamp: 1 });
  } else {
    // ✅ جلب الرسائل الخاصة بالمستخدم الحالي
    messages = await Message.find({
      property: new ObjectId(property._id),
      $or: [
        { sender: new ObjectId(currentUserId), receiver: new ObjectId(receiverId) },
        { sender: new ObjectId(receiverId), receiver: new ObjectId(currentUserId) }
      ]
    }).sort({ timestamp: 1 });
  }

  res.render("chat-client", {
    user: user || admin,
    property,
    receiverId,
    messages,
    isAdmin: !!admin
  });
});

// ✅ صفحة السايدبار للمالك أو الأدمن
router.get("/owner-chat/:propertyId", async (req, res) => {
  const user = req.session.user;
  const admin = req.session.admin;

  if (!user && !admin) return res.redirect("/login");

  const currentUser = user || admin;

  // نجيب العقار علشان نعرف مين المالك
  const property = await Property.findById(req.params.propertyId).populate("userID");
  if (!property) return res.status(404).send("العقار غير موجود");

  const messages = await Message.find({ property: req.params.propertyId })
    .populate("sender receiver property");

  const clientsMap = {};
  messages.forEach(msg => {
    const otherUser = msg.sender._id.equals(currentUser._id) ? msg.receiver : msg.sender;

    // ✅ استبعاد المالك من قائمة العملاء
    if (!otherUser._id.equals(property.userID._id)) {
      if (!clientsMap[otherUser._id]) {
        clientsMap[otherUser._id] = { client: otherUser, property: msg.property };
      }
    }
  });

  res.render("chat-owner", {
    user: currentUser,
    clients: Object.values(clientsMap),
    isAdmin: !!admin
  });
});


// ✅ إرسال رسالة
router.post("/api/messages", async (req, res) => {
  const { sender, receiver, property, message } = req.body;

  // منع إرسال الرسائل من الأدمن
  const isAdmin = await Admin.findById(sender);
  if (isAdmin) {
    return res.status(403).json({ error: "Admins are not allowed to send messages." });
  }

  if (sender === receiver) {
    return res.status(400).json({ error: "Sender and receiver can't be the same" });
  }

  const newMessage = new Message({ sender, receiver, property, message });
  await newMessage.save();


  res.status(201).json(newMessage);
});

// ✅ جلب الرسائل عبر API
router.get("/api/messages/:propertyId/:receiverId", async (req, res) => {
  const user = req.session.user;
  const admin = req.session.admin;

  const currentUserId = user ? user._id : admin ? admin._id : null;
  if (!currentUserId) return res.sendStatus(401);

  const messages = await Message.find({
    property: req.params.propertyId,
    $or: [
      { sender: currentUserId, receiver: req.params.receiverId },
      { sender: req.params.receiverId, receiver: currentUserId }
    ]
  }).sort({ timestamp: 1 });

  res.json(messages);
});

// ✅ توجيه المستخدم أو الأدمن حسب دوره
router.get("/go-to-chat/:propertyId", async (req, res) => {
  const user = req.session.user;
  const admin = req.session.admin;
  const propertyId = req.params.propertyId;

  if (!user && !admin) return res.redirect("/login");

  try {
    const property = await Property.findById(propertyId).populate("userID");
    if (!property) return res.status(404).send("العقار غير موجود");

    if (user && user._id.toString() === property.userID._id.toString()) {
      return res.redirect(`/owner-chat/${propertyId}`);
    }

    if (admin) {
      return res.redirect(`/owner-chat/${propertyId}`);
    }

    return res.redirect(`/chat/${propertyId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("خطأ في السيرفر");
  }
});

module.exports = router;
