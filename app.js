const express = require('express')
const app = express()
const port = 3000
app.use(express.static('public'));
const methodOverride = require('method-override');
app.use(methodOverride('_method'));


app.set('view engine', 'ejs')
app.set('views', './views');
app.use(express.urlencoded({ extended: true }));

const Admin = require('./models/Admin');
const bcrypt = require('bcrypt');

const session = require('express-session');
const Message = require('./models/Message'); 


app.use(session({
  secret: 'mySecretKey123', 
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } 
}));


const mongoose = require('mongoose');
const createAdmin = require("./addAdmin");
mongoose.connect("mongodb://localhost:27017/realState").then(async() => {
  await createAdmin();
  app.listen(port, () => {
    console.log(`http://localhost:${port}`);
  });
 })
 .catch((err) => {
   console.log(err);
 });

//  /////////////// image//////////
const multer = require('multer');
const path = require('path');


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads'); 
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); 
  }
});
const upload = multer({ storage: storage });

app.get('/user/register', (req, res) => {
    res.render('user/Register'); 
  });
 
const User = require('./models/userSchema');



 app.post("/user/Register", upload.single('image'), async (req, res) => {
  try {
    const { username, email, password, confirmPassword, phone, address, nationalID } = req.body;

    // Validation
    if (!username || username.length < 3 || !/^[a-zA-Z\s]+$/.test(username)) {
      return res.render('user/Register', { error: "Username must be at least 3 letters and contain only letters." });
    }

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.render('user/Register', { error: "Invalid email." });
    }

    if (!password || password.length < 8 || 
        !/(?=.*[a-zA-Z])/.test(password) || 
        !/(?=.*\d)/.test(password) || 
        !/(?=.*[!@#$%^&*])/.test(password)) {
      return res.render('user/Register', { error: "Password must be at least 8 characters and include letters, numbers, and special characters." });
    }

    if (password !== confirmPassword) {
      return res.render('user/Register', { error: "Passwords do not match." });
    }

    if (!phone || !/^\d{10,15}$/.test(phone)) {
      return res.render('user/Register', { error: "Invalid phone number." });
    }

    if (!address) {
      return res.render('user/Register', { error: "Address is required." });
    }

    if (!nationalID || !/^\d{14}$/.test(nationalID)) {
      return res.render('user/Register', { error: "National ID must be 14 digits." });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.render('user/Register', { error: "Email already registered." });

    const existingNationalID = await User.findOne({ nationalID });
    if (existingNationalID) return res.render('user/Register', { error: "National ID already registered." });

    const hashedPassword = await bcrypt.hash(password, 10);

    const image = req.file ? req.file.filename : 'default-user.png';

    await User.create({
      username,
      email,
      password: hashedPassword,
      phone,
      address,
      nationalID,
      image
    });

    res.redirect("/Login");
  } catch (err) {
    console.log("Error inserting user:", err);
    res.status(500).render('user/Register', { error: "Server error. Please try again later." });
  }
});




app.get('/Login', (req, res) => {
    res.render('Login'); 
  });

  app.post('/Login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (admin) {
      const isMatch = await bcrypt.compare(password, admin.password);
      if (isMatch) {
        req.session.admin = {
          _id: admin._id,
          email: admin.email,
          name: admin.name
        };
        return res.redirect('/admin/dashboard');
      } else {
        return res.render('Login', { error: "Incorrect admin password." });
      }
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.render('Login', { error: "User not found." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      req.session.user = {
        _id: user._id,
        email: user.email,
        username: user.username,
        image: user.image,
        phone: user.phone,
        address: user.address
      };
      res.redirect("/");
    } else {
      res.render('Login', { error: "Incorrect user password." });
    }

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

  
  // ///////////add property ///////////////////
  const Property = require('./models/propertySchema');



app.get('/property/add', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/Login');
  }

  try {
    const categories = await Category.find(); 
    res.render('property/add', { categories }); 
  } catch (err) {
    console.error(err);
    res.render('property/add', { categories: [] }); 
  }
});



app.post('/property/add', upload.array('images', 30), async (req, res) => {
  try {
    const {
      category_name, address, price, status,
      area, number_of_rooms, number_of_bathroom, description
    } = req.body;

    
    if (!category_name || !address || !price || !status || !area || !number_of_rooms || !number_of_bathroom || !description)
      return res.status(400).send("Please fill in all required fields.");

    if (!req.files || req.files.length === 0)
      return res.status(400).send("Please upload at least one image.");

    const priceNum = Number(price), areaNum = Number(area),
          rooms = Number(number_of_rooms), baths = Number(number_of_bathroom);

    if (isNaN(priceNum) || priceNum <= 0 || isNaN(areaNum) || areaNum <= 0 || isNaN(rooms) || isNaN(baths))
      return res.status(400).send("Please enter valid numeric values.");

    const imagePaths = req.files.map(file => file.filename);
    const userId = req.session.user._id;

    
    req.session.pendingProperty = {
      userID: userId,
      category_name,
      address,
      price: priceNum,
      status,
      area: areaNum,
      number_of_rooms: rooms,
      number_of_bathroom: baths,
      description,
      images: imagePaths
    };

    return res.redirect('/payment/preview'); 
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal server error.");
  }
});


// //////// edit user////////////
app.get('/user/editUser', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/Login');
  }

  try {
    const user = await User.findOne({ email: req.session.user.email });
    if (!user) return res.redirect('/Login');

    res.render('user/editUser', { user }); 
  } catch (err) {
    console.error(err);
    res.status(500).send("حدث خطأ أثناء تحميل البيانات.");
  }
});

app.put('/user/editUser', upload.single('image'), async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/Login');
  }

  const updates = {
    username: req.body.username,
    email: req.body.email,
    phone: req.body.phone,
    address: req.body.address,
    nationalID: req.body.nationalID,
    password:req.body.password

  };
 

  if (req.file) {
    updates.image = req.file.filename;
  }

  try {
    const updatedUser = await User.findOneAndUpdate(
      { email: req.session.user.email },
      updates,
      { new: true }
    );

    
    req.session.user = {
      username: updatedUser.username,
      email: updatedUser.email
    };

    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send("حدث خطأ أثناء التحديث.");
  }
});


// //////////// show all properties////////

app.get('/property/allproperties', async (req, res) => {
  const categoryName = req.query.category_name;
  // if (!req.session.user) {
  //   return res.redirect('/Login');
  // }
  const user = req.session.user;

  try {
    const properties = categoryName
      ? await Property.find({ category_name: categoryName })
      : await Property.find();

    res.render('property/allproperties', {
      arr: properties,
      user, 
      message: req.query.favorite || null 
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching properties");
  }
});


//  /////////// my properties//////////


app.get('/property/myproperties', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/Login');
  }
  const userId = req.session.user._id;
  Property.find({userID:userId}).then((properties )=>{
    
    res.render('property/myproperties',{arr:properties })
  }).catch((err)=>{console.log(err)})
});

// //////////////// edit property////////

app.get('/property/editProperty/:id', async (req, res) => {
  const propertyId = req.params.id; 

  try {
    const property = await Property.findById(propertyId); 
    if (!property) {
      return res.status(404).send("Property not found"); 
    }

   
    res.render('property/editProperty', { property });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading property details."); 
  }
});


app.put('/property/editProperty/:id', upload.array('images', 10), async (req, res) => {
  const propertyId = req.params.id;

  const updates = {
    category_name: req.body.category_name,
    address: req.body.address,
    price: req.body.price,
    status: req.body.status,
    area: req.body.area,
    number_of_rooms: req.body.number_of_rooms,
    number_of_bathroom: req.body.number_of_bathroom,
    description: req.body.description,
  };

  try {
    const existingProperty = await Property.findById(propertyId);
    if (!existingProperty) {
      return res.status(404).send("Property not found");
    }

    
    if (req.files && req.files.length > 0) {
      updates.images = req.files.map(file => file.filename);
    } else {
      updates.images = existingProperty.images;
    }

    const updatedProperty = await Property.findByIdAndUpdate(propertyId, updates, { new: true });

    res.redirect(`/property/myproperties`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating property.");
  }
});
//  /////////////// delete property/////////////
app.delete('/property/delete/:id', async (req, res) => {
  const propertyId = req.params.id;

  const user = req.session.user;
  const admin = req.session.admin;

  if (!user && !admin) return res.redirect('/Login');

  try {
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).send("Property not found");

    
    if (user && property.userID.toString() !== user._id.toString()) {
      return res.status(403).send("Unauthorized");
    }

    
    await Message.deleteMany({ property: propertyId });

    
    await Booking.deleteMany({ propertyID: propertyId });

    
    await User.updateMany({}, { $pull: { favorites: propertyId } });

    
    await Notification.deleteMany({ text: { $regex: propertyId } });

    
    await Property.findByIdAndDelete(propertyId);

    
    if (admin) {
      res.redirect('/admin/properties?success=deleted');
    } else {
      res.redirect('/property/myproperties');
    }

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


// //////////////////// index/////////////////////
app.get("/", async (req, res) => {
  try {
    const user = req.session.user;

    const notifications = user
      ? await Notification.find({ userID: user._id }).sort({ createdAt: -1 })
      : [];

    const properties = await Property.find();

  
    const feedbacks = await Feedback.find()
  .populate('userId', 'username image') // ✅ 'image'
  .sort({ date: -1 });
 const categories = await Category.find();
    res.render("Index", {
      user: user || null,
      notifications,
      properties,
      feedbacks, 
      categories 
    });
  } catch (err) {
    console.error(err);
    res.render("Index", {
      user: null,
      notifications: [],
      properties: [],
      feedbacks: [],
       categories :[]
    });
  }
});


app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});
// //////// search ///////
app.get('/results', (req, res) => {
  res.render('results'); 
});
app.get('/api/properties', async (req, res) => {
  const { category, maxPrice, status } = req.query;
  const filter = {};

  if (category) filter.category_id = Number(category);
  if (maxPrice) filter.price = { $lte: Number(maxPrice) };
  if (status) filter.status = status;

  try {
    const properties = await Property.find(filter);
    res.json({ properties });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});


// //////// category/////////

const Category = require('./models/category'); 



app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find();
        res.json({ categories }); 
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



// //// rate////////
const Feedback = require('./models/rate'); 

app.get("/rate", (req, res) => {
  res.render("rate"); 
});

app.post('/rate', async (req, res) => {
  const { rating, comment } = req.body;
  const userId = req.session.user._id;

  if (!userId) {
    return res.redirect('/login');
  }

  try {
      const feedback = new Feedback({
          userId,
          rating,
          comment
      });

      await feedback.save();
      res.redirect('/'); 
  } catch (err) {
      console.error('Error saving feedback:', err);
      res.status(500).send('An error occurred while submitting feedback.');
  }
});

// /////////////// details//////////
app.get('/property/details/:id', async (req, res) => {
  const propertyId = req.params.id; 
  if (!req.session.user && !req.session.admin) {
  return res.redirect('/Login');
}

  const userID = req.session.user ? req.session.user._id : null;

  try {
    const property = await Property.findById(propertyId); 
    if (!property) {
      return res.status(404).send("Property not found"); 
    }

    
    res.render('property/details', {
      property: property,
      userID: userID  });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading property details."); 
  }
});
// ///////////// search /////////// 
// راوت البحث
app.get('/search', async (req, res) => {
  const { category, maxPrice, address,status } = req.query;

  const query = {};

  if (category) {
    query.category_name = category; 
  }

  if (maxPrice) {
    query.price = { $lte: Number(maxPrice) }; 
  }
  if (address) {
   
    query.address = { $regex: address, $options: 'i' };
  }
  if (status) {
    query.status = status;
  }

  try {
    const properties = await Property.find(query);
    
    
    if (!req.session.user) {
  return res.redirect('/Login');
}
const user = await User.findById(req.session.user._id);


    
    res.render('results', { properties, user });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching properties');
  }
});




// ////// booking////////////
const Booking = require('./models/booking'); 
app.use(express.json());


app.post('/book', async (req, res) => {
  const { datetime, userID, propertyID } = req.body;

  console.log("Booking received: ", { datetime, userID, propertyID });

  try {
    const requestedDate = new Date(datetime);
    const now = new Date();

    
    if (requestedDate <= now) {
      return res.json({ message: "You cannot book a past date/time.", success: false });
    }

    
    const existingBooking = await Booking.findOne({
      propertyID,
      datetime: requestedDate
    });

    if (existingBooking) {
      return res.json({ message: "This time slot is already booked. Please choose another one.", success: false });
    }

    
    const newBooking = new Booking({
      userID,
      propertyID,
      datetime: requestedDate
    });

    await newBooking.save();
// ✅ Fetch the property to get the owner's ID (userID)
    const property = await Property.findById(propertyID);
    if (property && property.userID) {
      const ownerId = property.userID.toString();

      // 🔔 Create a notification for the property owner
      const ownerNotification = new Notification({
        userID: ownerId,
        text: `Your property "${property.address}" has been booked. <a href="/property/mybooks/${propertyID}">Check the reservations page.</a> `,
        
      });

      await ownerNotification.save();
      console.log("📬 Notification saved for owner:", ownerId);
    } else {
      console.log("❌ Property or owner not found.");
    }

    res.json({ message: "Booking successful!", success: true });

  } catch (error) {
    console.error("Error checking or saving booking:", error);
    res.status(500).json({ message: "Server error. Please try again.", success: false });
  }
});

app.get('/property/:propertyID/bookings', (req, res) => {
  const { propertyID } = req.params;

  Booking.find({ propertyID: propertyID }) // Find bookings for the specific property
    .then(bookings => {
      res.render('bookings', { propertyID, bookings }); // Render the EJS template with the bookings data and propertyID
    })
    .catch(err => {
      console.error('Error fetching bookings:', err);
      res.status(500).send('Error fetching bookings');
    });
});
// //////// mybooks/////////////////
app.get('/property/mybooks/:propertyId', async (req, res) => {
  const propertyId = req.params.propertyId;

  try {
    
    const bookings = await Booking.find({ propertyID: propertyId })
      .populate('userID', 'username').populate('propertyID', 'address'); 

    console.log(bookings);  
    
    
    res.render('property/mybooks', { 
      bookings: bookings,
      propertyId: propertyId
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving bookings');
  }
});

// ///////// notifications//////////////////
const Notification = require('./models/Notification');




app.delete('/bookings/:bookingId/reject', async (req, res) => {
  const { bookingId } = req.params;
  const { userID } = req.body;

  try {
    const booking = await Booking.findByIdAndDelete(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    
    const propertyId = booking.propertyID; 

    const notification = new Notification({
      userID,
     text: `Your booking for property has been rejected. Kindly choose another time slot <a href="/property/details/${propertyId}">click here</a>`

    });
    await notification.save();

    res.json({ message: 'Booking rejected and user notified' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error rejecting booking' });
  }
});






app.post('/bookings/:bookingId/approve', async (req, res) => {
  const { bookingId } = req.params;
  const { userID } = req.body;

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = 'approved'; 
    await booking.save();

    const propertyId = booking.propertyID;

    const notification = new Notification({
      userID,
      text: `Your booking has been approved! <a href="/property/details/${propertyId}">View Property</a>`
    });

    await notification.save();

    res.json({ message: 'Booking approved and user notified' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error approving booking' });
  }
});



app.get('/notifications', async (req, res) => {
  try {
    const userId = req.session.user && req.session.user._id;
    if (!userId) {
      return res.status(401).send('Unauthorized: User not logged in');
    }

    const notifications = await Notification.find({ userID: userId }).sort({ createdAt: -1 });

    res.render('notifications', { notifications });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading notifications');
  }
});

app.delete('/notifications/clear', async (req, res) => {
  try {
    const userId = req.session.user && req.session.user._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    await Notification.deleteMany({ userID: userId });

    res.json({ message: 'All notifications cleared' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error clearing notifications' });
  }
});

// ///////// forget password//////////////////
const sendCode = require('./utils/mail');
const ResetToken = require('./models/ResetToken');
app.get('/forgetPassword', (req, res) => {
  res.render('forgetPassword', { error: null }); 
});


app.post('/forgetPassword', async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.render('forgetPassword', { error: "❌ Email not found" });


  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); 

  await ResetToken.deleteMany({ email }); 
  await ResetToken.create({ email, code, expiresAt });

  await sendCode(email, code); 
  req.session.resetEmail = email;

  res.redirect('/verifyCode');
});

// ---------------- Verify Code ----------------
app.get('/verifyCode', (req, res) => {
 
  res.render('verifyCode', { error: null });
});

app.post('/verifyCode', async (req, res) => {
  const { code } = req.body;
  const email = req.session.resetEmail;
  const token = await ResetToken.findOne({ email, code });

  if (!token || token.expiresAt < new Date()) {
  return res.render('verifyCode', { error: "❌ Code invalid or expired" });
}


  req.session.verifiedReset = true;
  res.redirect('/resetPassword');
});

// ---------------- Reset Password ----------------
app.get('/resetPassword', (req, res) => {
  if (!req.session.verifiedReset) {
    return res.render('resetPassword', { error: "Unauthorized" });
  }
  res.render('resetPassword', { error: null }); 
});

app.post('/resetPassword', async (req, res) => {
  const { password } = req.body;
  const email = req.session.resetEmail;

  if (!password || password.length < 8 ||
    !/(?=.*[a-zA-Z])/.test(password) ||
    !/(?=.*\d)/.test(password) ||
    !/(?=.*[!@#$%^&*])/.test(password)) {
    return res.render('resetPassword', { error: "❌ Password must be at least 8 chars, include letters, numbers & special characters"});
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await User.findOneAndUpdate({ email }, { password: hashedPassword });

  
  req.session.resetEmail = null;
  req.session.verifiedReset = null;

  res.redirect("/Login");

});

// ////////// admin////////////


app.get('/admin/dashboard', async (req, res) => {
  
  if (!req.session.admin) {
    return res.redirect('/Login'); 
  }

  try {
    const totalUsers = await User.countDocuments();
    const totalProperties = await Property.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const totalCategories = await Category.countDocuments();
    const totalFeedbacks = await Feedback.countDocuments();
    const totalMessages = await ContactMessage.countDocuments();

    res.render('admin/dashboard', {
      admin: req.session.admin,
      stats: {
        users: totalUsers,
        properties: totalProperties,
        bookings: totalBookings,
        categories: totalCategories,
        feedbacks: totalFeedbacks,
        messages: totalMessages
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error while loading dashboard');
  }
});

// Admin Users Page
app.get('/admin/users', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/Login');
  }
  try {
    const users = await User.find().sort({ createdAt: -1 });
    const success = req.session.usersSuccess || '';
    req.session.usersSuccess = null;
    res.render('admin/users', {
      admin: req.session.admin,
      users,
      success
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading users');
  }
});

// Admin Properties Page
app.get('/admin/properties', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/Login');
  }
  try {
    const properties = await Property.find().populate('userID', 'username _id');
    res.render('admin/properties', { properties, success: req.query.success });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading properties for admin.');
  }
});

// Admin Bookings Page
app.get('/admin/bookings', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/Login');
  }
  try {
    const bookings = await Booking.find()
      .populate('userID', 'username email')
      .populate({
        path: 'propertyID',
        select: 'propertyID address price status userID',
        populate: { path: 'userID', select: 'username email' }
      })
      .sort({ createdAt: -1 });
    const success = req.session.bookingsSuccess || '';
    req.session.bookingsSuccess = null;
    res.render('admin/bookings', {
      admin: req.session.admin,
      bookings,
      success
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading bookings');
  }
});

// Admin Categories Page
app.get('/admin/categories', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/Login');
  }
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    const Property = require('./models/propertySchema');
    const categoriesWithCount = await Promise.all(categories.map(async (cat) => {
      const count = await Property.countDocuments({ category_name: cat.name });
      return { ...cat.toObject(), propertiesCount: count };
    }));
    const success = req.session.categoriesSuccess || '';
    req.session.categoriesSuccess = null;
    res.render('admin/categories', {
      admin: req.session.admin,
      categories: categoriesWithCount,
      success
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading categories');
  }
});

// Admin Feedbacks Page
app.get('/admin/feedbacks', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/Login');
  }

  try {
    const feedbacks = await Feedback.find()
      .populate('userId', 'username email')
      .sort({ date: -1 });
    const success = req.session.feedbackSuccess || '';
    req.session.feedbackSuccess = null;
    res.render('admin/feedbacks', {
      admin: req.session.admin,
      feedbacks,
      success
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading feedbacks');
  }
});

app.post('/admin/feedbacks/:id/delete', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/Login');
  }
  try {
    await Feedback.findByIdAndDelete(req.params.id);
    req.session.feedbackSuccess = 'Feedback deleted successfully';
    res.redirect('/admin/feedbacks');
  } catch (err) {
    console.error('Error deleting feedback:', err);
    res.status(500).send('Error deleting feedback');
  }
});

// Admin Messages Page
app.get('/admin/messages', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/Login');
  }
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    const success = req.session.messagesSuccess || '';
    req.session.messagesSuccess = null;
    res.render('admin/messages', {
      admin: req.session.admin,
      messages,
      success
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading messages');
  }
});

// Admin Logout
app.post('/admin/logout', (req, res) => {
  req.session.admin = null;
  res.redirect('/Login');
});


// تفاصيل مستخدم للإدارة
app.get('/admin/users/:id', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/Login');
  }
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send('User not found');
    res.render('admin/userDetails', { admin: req.session.admin, user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading user details');
  }
});

// حذف مستخدم للإدارة
app.post('/admin/users/:id/delete', async (req, res) => {
  if (!req.session.admin) return res.redirect('/Login');

  try {
    const userId = req.params.id;

    // حذف العقارات الخاصة باليوزر
    const properties = await Property.find({ userID: userId });

    for (const property of properties) {
      await Booking.deleteMany({ propertyID: property._id });
      await Message.deleteMany({ propertyID: property._id });
      await User.updateMany({}, { $pull: { favorites: property._id } });
      await Property.findByIdAndDelete(property._id);
    }

    await Booking.deleteMany({ userID: userId });
    await Message.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] });
    await Notification.deleteMany({ userID: userId });

    // ✅ حذف الفيدباك اللي كتبه اليوزر
    await Feedback.deleteMany({ userId: userId });

    // ✅ حذف رسائل "اتصل بنا" الخاصة باليوزر
    await ContactMessage.deleteMany({ email: (await User.findById(userId)).email });

    // حذف اليوزر نفسه
    await User.findByIdAndDelete(userId);

    req.session.usersSuccess = 'User and related data deleted successfully';
    res.redirect('/admin/users');

  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting user');
  }
});



app.post('/bookings/:bookingId/delete', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/Login');
  }
  try {
    await Booking.findByIdAndDelete(req.params.bookingId);
    req.session.bookingsSuccess = 'Booking deleted successfully';
    res.redirect('/admin/bookings');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting booking');
  }
});

app.post('/admin/categories/add', upload.single('image'), async (req, res) => {
  if (!req.session.admin) return res.redirect('/Login');

  try {
    const { name, description } = req.body;
    const image = req.file ?  req.file.filename : '';

    // احضار آخر category_id وزيادته بـ1
    const lastCategory = await Category.findOne().sort({ category_id: -1 });
    const newCategoryId = lastCategory ? Number(lastCategory.category_id) + 1 : 1;

    await Category.create({
      name,
      description,
      image,
      category_id: newCategoryId
    });

    req.session.categoriesSuccess = 'Category added successfully';
    res.redirect('/admin/categories');
  } catch (err) {
    console.error('Error adding category:', err);
    res.status(500).send('Error adding category');
  }
});


app.post('/admin/categories/edit', upload.single('image'), async (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/Login');
  }
  try {
    const { _id, name, description } = req.body;
    let update = { name, description };
    if (req.file) {
      update.image = req.file.filename;
    }
    await Category.findByIdAndUpdate(_id, update);
    req.session.categoriesSuccess = 'Category updated successfully';
    res.redirect('/admin/categories');
  } catch (err) {
    console.error('Error editing category:', err);
    res.status(500).send('Error editing category');
  }
});

app.post('/admin/categories/:id/delete', async (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/Login');
  }
  try {
    await Category.findByIdAndDelete(req.params.id);
    req.session.categoriesSuccess = 'Category deleted successfully';
    res.redirect('/admin/categories');
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).send('Error deleting category');
  }
});


// /////////////// profile////////////////
app.get('/user/profile', async (req, res) => {
  const sessionUser = req.session.user;
  if (!sessionUser) {
    return res.redirect('/Login');
  }

  // Fetch full user info from DB
  const user = await User.findById(sessionUser._id).lean();
  if (!user) {
    return res.redirect('/Login');
  }

  // Count their properties
  const propCount = await Property.countDocuments({ userID: user._id });

  res.render('user/profile', {
    user,
    propCount
  });
});
// //////////// contact us/////////////
const ContactMessage=require('./models/ContactMessage')




app.post('/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Check if the user is logged in
    if (!req.session.user) {
      return res.redirect('/login');
    }

    // Ensure the submitted email matches the logged-in user's email
    if (email !== req.session.user.email) {
      return res.status(403).send("❌ The entered email does not match your account email.");
    }

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).send("❌ All fields are required.");
    }

    // Save the message and link it to the user
    await ContactMessage.create({
      name,
      email,
      message,
      user: req.session.user._id
    });

    
    res.redirect('/?message=Message sent successfully');

  } catch (err) {
    console.error('❌ Error saving contact message:', err);
    res.status(500).send('Something went wrong on the server.');
  }
});


app.get('/admin/messages', async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.render('admin/messages', { messages });
// لازم يكون عندك ملف EJS اسمه adminMessages.ejs
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).send("Internal Server Error");
  }
});



// //////////////// favorite/////////////
app.get('/favorite/:id', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/Login');
  }

  const propertyId = req.params.id;
  const user = await User.findById(req.session.user._id);

  if (!mongoose.Types.ObjectId.isValid(propertyId)) {
    return res.redirect('/my-favorites?error=InvalidID');
  }

  const index = user.favorites.indexOf(propertyId);
  let message = '';

  if (index === -1) {
    user.favorites.push(propertyId);
    message = 'added';
  } else {
    user.favorites.splice(index, 1);
    message = 'removed';
  }

  await user.save();
  req.session.user = user; // تحديث الجلسة

  // ✅ التوجيه إلى صفحة المفضلة بدل allproperties
  res.redirect(`/my-favorites?favorite=${message}`);
});



// ✅ Route لعرض العقارات المفضلة
app.get('/my-favorites', async (req, res) => {
  const userId = req.session.user?._id;
  if (!userId) return res.redirect('/Login');

  const user = await User.findById(userId).populate('favorites');
  res.render('favorite', { favorites: user.favorites });
});


// ✅ Route لحذف عقار من المفضلة
app.get('/favorite/remove/:id', async (req, res) => {
  const propertyId = req.params.id;
  const user = await User.findById(req.session.user._id);

  user.favorites = user.favorites.filter(fav => fav.toString() !== propertyId);
  await user.save();
  req.session.user = user;

  res.redirect(`/my-favorites?favorite=removed`);
});

// //////////////// chat//////////////
const chatRoutes = require("./routes/chatRoutes");
app.use(chatRoutes);



/////////////////////////shaimaa /////////////////////////////// 
const axios = require('axios');
const PAYMOB_API_KEY = 'ZXlKaGJHY2lPaUpJVXpVeE1pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmpiR0Z6Y3lJNklrMWxjbU5vWVc1MElpd2ljSEp2Wm1sc1pWOXdheUk2TVRBMU5EQTJOeXdpYm1GdFpTSTZJbWx1YVhScFlXd2lmUS45WEt1bWEwUnh4LVRHQjhDVDhsSzJGYk5LQlRROHhhOWpBakpQTnlvM2dvaGl5alJBampISGpsOW50MTE3cUIybThzZVFMZFJ1a191ZHBTYTZnV3ZRdw==';
;
const PAYMOB_INTEGRATION_ID = '5145432';
app.get('/payment/preview', async (req, res) => {
  const property = req.session.pendingProperty;
  if (!property) return res.status(400).send("No property data found.");

  let percentage = property.status.toLowerCase() === 'rent' ? 0.2 : 0.15;
  const amountToPay = Math.round(property.price * percentage);

  return res.render('property/payment', {
    price: property.price,
    amount: amountToPay,
    propertyStatus: property.status,
    propertyID: 'temporary-id', // مش مهم دلوقتي
    property: { _id: 'temp' } // عشان تتفادي خطأ EJS
  });
});
app.post('/pay', async (req, res) => {
  const property = req.session.pendingProperty;
  if (!property) return res.status(400).send("No property in session");

  let percentage = property.status.toLowerCase() === 'rent' ? 0.2 : 0.15;
  const amountToPay = Math.round(property.price * percentage);

  try {
    const authResponse = await axios.post('https://accept.paymob.com/api/auth/tokens', {
      api_key: PAYMOB_API_KEY,
    });

    const authToken = authResponse.data.token;

    const orderResponse = await axios.post('https://accept.paymob.com/api/ecommerce/orders', {
      auth_token: authToken,
      delivery_needed: false,
      amount_cents: amountToPay * 100,
      currency: "EGP",
      items: [{ name: property.category_name, amount_cents: amountToPay * 100, description: property.description, quantity: 1 }]
    });

    const paymentKeyResponse = await axios.post('https://accept.paymob.com/api/acceptance/payment_keys', {
      auth_token: authToken,
      amount_cents: amountToPay * 100,
      expiration: 3600,
      order_id: orderResponse.data.id,
      billing_data: {
        apartment: 'NA',
        email: req.session.user.email,
        floor: 'NA',
        first_name: req.session.user.username || 'User',
        street: 'NA',
        building: 'NA',
        phone_number: req.session.user.phone || '01234567890',
        shipping_method: 'PKG',
        postal_code: '00000',
        city: 'Cairo',
        country: 'EG',
        last_name: 'User',
        state: 'NA'
      },
      currency: "EGP",
      integration_id: PAYMOB_INTEGRATION_ID,
      redirect_url: "http://localhost:3000/property/payment_success"
    });

    const paymentToken = paymentKeyResponse.data.token;
    res.render('property/paymob_payment', { paymentToken });
  } catch (err) {
    console.error(err);
    res.status(500).send("Payment initiation failed.");
  }
});
app.get('/property/payment_success', async (req, res) => {
  const propertyData = req.session.pendingProperty;
  if (!propertyData) return res.status(400).send("No property to save.");

  try {
    const newProperty = new Property(propertyData);
    await newProperty.save();

    const users = await User.find({ _id: { $ne: propertyData.userID } });
    const notificationText = `A new property has been added. <a href="/property/details/${newProperty._id}">View Details</a>`;
    const notifications = users.map(user => ({
      userID: user._id,
      text: notificationText
    }));

    await Notification.insertMany(notifications);

    delete req.session.pendingProperty;

    return res.render('property/payment_success', { property: newProperty });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error saving property after payment.");
  }
});