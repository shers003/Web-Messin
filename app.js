//requiring pacakges
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const ejs = require('ejs');
const env = require('dotenv').config();
const passport = require('passport');
const session = require('express-session');
const loaclStrategy = require('passport-local').Strategy;

const app = express();
const port = 3000;
const uri = 'mongodb://localhost:27017/messinDB'

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static('static'));
app.set('view engine', 'ejs');
app.use(passport.initialize());
app.use(passport.session());

//creating user login session
const sess = {
  name:'userSess',
  secret: process.env.SESSIONSECRET,
  resave:false,
  saveUninitialized:false
};
app.use(session(sess));

passport.serializeUser((user,done)=>{
  done(null, user.id);
});
passport.deserializeUser((id,done)=>{
  User.findById(id,(err,user)=>{
    done(err,user);
  });
});

passport.use(new loaclStrategy((username, password, cb)=>{
  User.findOne({username:username},(err,user)=>{
    if(!err){
      if(user){
        if(user.validPassword(password)){
          return cb(null,user)
        }else{
          return cb(null,false, {message:'Incorrect password'})
        }
      }else{
        //note see if these actually need to be retuerned possible error
        return cb(null, false, {message:'My Man don\'t even exist'})
      }
    }else{
      return cb(err)
    }
  });
}));


//Setting up database
mongoose.connect(uri,{useNewUrlParser:true, useUnifiedTopology:true},(err)=>{
  if(!err){
    console.log('connected succesfuly to mongo');
  }else{
    console.log(err);
  }
});

//user collection
const userSchema = new mongoose.Schema({
  username:String,
  password:String
});

const User = new mongoose.model('user',userSchema);


//routing
app.get('/',(req,res)=>{
    res.render('index');
    console.log(req.session);
});

app.route('/register') .get((req,res)=>{
  console.log('yep');
  res.render('register');
}) .post((req,res)=>{
  let saltrounds = 10
  let username = req.body.username;
  let password = bcrypt.hashSync(req.body.password, saltrounds);

  const user = new User({
    username:username,
    password:password
  });

  user.save((err)=>{
    if(!err){
      console.log(user);
      res.send('u had been saved')
    }else{console.log(err);}
  });
});

app.route('/login') .get((req,res)=>{
  res.send('who u blud?')
}) .post((req,res)=>{
  saltrounds = 10;
  let username = req.body.username;
  let password = req.body.password;

  User.findOne({username:username}, (err, user)=>{
    if(!err){
      if(user){
        let check = bcrypt.compareSync(req.body.password,user.password);
        if(check){
          res.send('My g')
        }else{res.send('Aye don\'t be gettin me MAD!!');}
      }else{res.send('I don\'t know u still!')}
    }else{console.log(err);}
  });
});

app.route('/post') .get((req,res)=>{
  res.send('well be a page obvs');
}) .post((req,res)=>{


});

app.listen(port,(req,res)=>{
  console.log('Connected successfuly');
});
