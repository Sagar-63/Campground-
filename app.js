if(process.env.NODE_ENV!=="production"){
    require('dotenv').config();
}


const express=require('express');
const app=express();
const path=require('path');
const mongoose=require('mongoose');
const ejsMate=require('ejs-mate'); //Changing the default ejs parser and using this ejs-mate to parse the ejs
const Joi=require('joi');
const {campgroundSchema,reviewSchema}=require('./schema');
const methodOverride=require('method-override');
 //const dbUrl='mongodb://localhost:27017/yelpcamp'
const dbUrl=process.env.DB_URL || 'mongodb://localhost:27017/yelpcamp';
mongoose.connect(dbUrl,{
    useNewUrlParser:true,     //use of these params
    //useCreateIndex:true,   why db is not connected when this is set to true 
     useUnifiedTopology:true
})
.then(()=>{console.log('Connected TO DB');})
.catch(()=>{console.log('Not connected to DB');})
const session=require('express-session');
const flash=require('connect-flash');
const MongoDBStore=require('connect-mongo')(session);
const passport=require('passport');
const LocalStrategy=require('passport-local');
 const Campground=require('./models/campground');
 const Review=require('./models/review')
const { nextTick } = require('process');
const ExpressError=require('./utilis/ExpressError');

const multer=require('multer');
const {storage}=require('./cloudinary/index.js');
const upload=multer({storage});

app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));
app.use(express.urlencoded({extended:true}));   //to parse the form data
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

const User=require('./models/user');
app.engine('ejs',ejsMate);

const secret=process.env.SECRET || 'thisshouldbeabettersecret!';

const store=new MongoDBStore({
    url:dbUrl,
    secret,
    touchAfter:24*60*60   //in seconds
})

store.on("error",function(e) {
    console.log('Store Error',e);
})

const sessionConfig={
    store,
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,    //in miliseconds
        maxAge: 1000 * 60 * 60 * 24 * 7
    }

}

app.use(session(sessionConfig));
app.use(flash());



app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
   res.locals.currentUser=req.user;  next(); 
});

app.listen(3000,()=>{
    console.log('Serving on Port 3000');
});

const {isLoggedIn}=require('./middleware');

const isAuthor=async (req,res,next)=>{
    const {id}=req.params;
    const campground=await Campground.findById(id);
    if(!campground.author.equals(req.user._id)){
     //flash message
    return res.redirect(`/campgrounds/${id}`);
    }
    next();
}

const isReviewAuthor=async (req,res,next)=>{
    const {id,reviewId}=req.params;
    const review=await Review.findById(reviewId);
    if(!review.author.equals(req.user._id)){
     //flash message
     return res.redirect(`/campgrounds/${id}`);
    }
    next();
}

const validateCampground=(req,res,next)=>{
      const {error}=campgroundSchema.validate(req.body); //campgroundSchema.validate(req.body) this will validate if req.body is following these rules we specified in campgroundSchema,and return an object which we are destructuring
      if(error){
          const msg=error.details.map(el=>el.message).join(',');
          throw new ExpressError(msg,400);
      }
      else{next();}
}

const validateReview=(req,res,next)=>{
    const {error}=reviewSchema.validate(req.body);
    if(error){
        const msg=error.details.map(el=>el.message).join(',');
        throw new ExpressError(msg,400);
    }
    else{next();}
}

app.get('/',(req,res)=>{
    res.render('home');
})

app.get('/campgrounds',async (req,res)=>{
    try{
    const campgrounds=await Campground.find({});
    res.render('campgrounds/index',{campgrounds});}
    catch(e){
        next(e);
    }
})

app.get('/campgrounds/new',isLoggedIn,(req,res)=>{             //why /campgrounds/new,/campgrounds/:id not interfere
    res.render('campgrounds/new');
})

app.get('/campgrounds/:id',async (req,res,next)=>{
    try{
    const campground=await Campground.findById(req.params.id).populate({
        path:'reviews',
        populate:{
            path:'author'
        }
    }).populate('author');
  //  console.log('campground is',campground);
    res.render('campgrounds/show',{campground});}
    catch(e){
        next(e);
    }
})



app.post('/campgrounds',isLoggedIn,upload.array('image'),validateCampground,async (req,res,next)=>{
    try{
     const newcampground=new Campground(req.body.campground);
     newcampground.images = req.files.map(f => ({ url: f.path, filename: f.filename }));
    newcampground.author=req.user._id;
    await newcampground.save();
    console.log(newcampground);
    res.redirect(`/campgrounds/${newcampground._id}`);}

    catch(e){next(e);}
   
})

app.get('/campgrounds/:id/edit',isLoggedIn,isAuthor,async (req,res)=>{
    try{
    const {id}=req.params;
    const campground=await Campground.findById(id);
    res.render('campgrounds/edit',{campground});}
    catch(e){
        next(e);
    }
})

app.put('/campgrounds/:id',isLoggedIn,isAuthor,upload.array('image'),validateCampground,async (req,res,next)=>{
    try{
    const {id}=req.params;
    const campground=await Campground.findByIdAndUpdate(id,{...req.body.campground});
    
    const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
    campground.images.push(...imgs);
   await campground.save();
    res.redirect(`/campgrounds/${id}`);}
    catch(e){
        next(e);
    }
})

app.delete('/campgrounds/:id',isLoggedIn,isAuthor,async (req,res)=>{
    try{
    const {id}=req.params;
    const campground=await Campground.findByIdAndDelete(id);
    res.redirect('/campgrounds');}
    catch(e){
        next(e);
    }
})

app.post('/campgrounds/:id/reviews',isLoggedIn,validateReview,async (req,res)=>{
    const campground=await Campground.findById(req.params.id);
    const review=new Review(req.body.review);
    review.author=req.user._id;
    campground.reviews.push(review);
   await campground.save();
   await review.save();
   res.redirect(`/campgrounds/${campground._id}`);
})

app.delete('/campgrounds/:id/reviews/:reviewId',isLoggedIn,isReviewAuthor,isReviewAuthor,async (req,res)=>{
    try{
    const {id,reviewId}=req.params;
    await Campground.findByIdAndUpdate(id,{$pull:{reviews:reviewId}});
    await Review.findByIdAndDelete(reviewId);
    res.redirect(`/campgrounds/${id}`);}
    catch(e){
        next(e);
    }
})

app.get('/fakeUser',async (req,res)=>{
    const user=new User({email:"fielder", username:'Sagar'});
  const newUser=await User.register(user,'sagar123');
  res.send(newUser);
})

app.get('/register',(req,res)=>{
    res.render('users/register');
})
app.post('/register',async (req,res)=>{
    try{
   const {username,email,password}=req.body;
   const user=new User({username,email});
   const registeredUser=await User.register(user,password);
   req.login(registeredUser,(err)=>{
       if(err){return next(err);}
       //flash message code to be written here.
       res.redirect('/campgrounds');
   })
}
   catch(e){
       //flash message code to be written here.
       
       res.redirect('/register');
   }
})

app.get('/login',(req,res)=>{
    res.render('users/login');
})
app.post('/login',passport.authenticate('local',{failureFlash:true,failureRedirect:'/login'}),(req,res)=>{
// flash message
   const redirectURL=req.session.returnTo || '/campgrounds';
   delete req.session.returnTo;
   res.redirect(redirectURL);
})

app.get('/logout',(req,res)=>{
    req.logout();
    //flash message
    res.redirect('/campgrounds');
})

app.all('*',(req,res,next)=>{
   next(new ExpressError('Page Not Found',404));
})

app.use((err,req,res,next)=>{
      const {status=500}=err;
      if(!err.message){
          err.message='Something Went Wrong';
      }
      res.status(status).render('campgrounds/error',{err});
})

