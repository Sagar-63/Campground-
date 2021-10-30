const mongoose=require('mongoose');

const passportLocalMongoose=require('passport-local-mongoose');

const userSchema=new mongoose.Schema({
    email:{
        type:String,
        required:true,
        unique:true     //what is the use of unique
    }
})
userSchema.plugin(passportLocalMongoose);
module.exports=mongoose.model('User',userSchema);