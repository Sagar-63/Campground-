const mongoose=require('mongoose');
const cities=require('./cities');
const {descriptors,places}=require('./seedHelpers');
const Campground=require('../models/campground');

mongoose.connect('mongodb://localhost:27017/yelpcamp',{
    useNewUrlParser:true,     
     useUnifiedTopology:true
})
.then(()=>{console.log('Connected TO DB');})
.catch(()=>{console.log('Not connected to DB');})

const randval=(array)=>{return array[Math.floor(Math.random()*array.length)];}

const seedDB=async()=>{
   await Campground.deleteMany({});
    for(let i=0;i<50;i++){
        let random1000=Math.floor(Math.random()*1000);
        const price=Math.floor(Math.random()*30)+10;
        const camp=new Campground({
            location:`${cities[random1000].city}, ${cities[random1000].state}`,
            title:`${randval(descriptors)} ${randval(places)}`,
            description:'Camp A Way in Lincoln, NE is the top choice to for RVs, Tents, and Cabins. Families, Kids, & Pets all have a great time when they stay at Camp A Way. Open Year Round. For Tents Cabins & RVs.',
            price:price,
            images:{
                url: 'https://res.cloudinary.com/dfrfgwvmm/image/upload/v1635584721/YelpCamp/a7us0cuj9lqshfksmp95.jpg',
                filename: 'YelpCamp/a7us0cuj9lqshfksmp95',
              },          
            author:'617a77d0066255e4a3e8988d'
        })
        await camp.save();
    }
}

seedDB();    //.then(()=>{mongoose.connection.close();})
