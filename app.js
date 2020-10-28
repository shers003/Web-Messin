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
const MongoStore = require('connect-mongo')(session);

const app = express();
const port = 3000;
const uri = 'mongodb://localhost:27017/messinDB'
const connection = mongoose.createConnection(uri,{useNewUrlParser:true, useUnifiedTopology:true});

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static('static'));
app.set('view engine', 'ejs');
app.use(passport.initialize());
app.use(passport.session());

// took inspiration from https://levelup.gitconnected.com/everything-you-need-to-know-about-the-passport-local-passport-js-strategy-633bbab6195
const sessionstore = new MongoStore({mongooseConnection: connection, collection:'sessions'})

//creating user login session
const sess = {
  name:'userSess',
  secret: process.env.SESSIONSECRET,
  resave:false,
  saveUninitialized:false,
  store:sessionstore
};
app.use(session(sess));

passport.serializeUser((user,done)=>{
  console.log('serializeUser '+ user);
  done(null, user.id);
});
passport.deserializeUser((id,done)=>{
  console.log('deserializeUser '+ id);
  User.findById(id,(err,user)=>{
    done(err,user);
  });
});

passport.use(new loaclStrategy((username, password, cb)=>{
  User.findOne({username:username},(err,user)=>{
    if(!err){
      if(user){
        if(user.validPassword(user,password)){
          console.log('User was authenticated in the strategy');
          return cb(null,user)
        }else{
          console.log('Password Incorrect');
          return cb(null,false, {message:'Incorrect password'})
        }
      }else{
        console.log('No user found in strategey');
        //note see if these actually need to be retuerned possible error
        return cb(null, false, {message:'My Man don\'t even exist'})
      }
    }else{
      console.log(err);
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
userSchema.methods.validPassword = (user,pwd)=>{
  const userPwd = user.password;
  const pass = bcrypt.compareSync(pwd, userPwd);
  return pass;
};

const User = new mongoose.model('user',userSchema);



//routing
app.get('/',(req,res)=>{
    res.render('index');
});

app.route('/register') .get((req,res)=>{
  console.log('User sent get request to /register');
  res.render('register');
}) .post((req,res)=>{
  let saltrounds = 10
  let username = req.body.username;
  let password = bcrypt.hashSync(req.body.password, saltrounds);

  const user = new User({
    username:username,
    password:password
  });

  User.findOne({username:username}, (err, user)=>{
    if(!err){
      if(!user){
        user.save((err)=>{
          if(!err){
            console.log('This user is now save '+user);
            res.send('u had been saved')
          }else{console.log(err);}
        });
      }else{
        console.log('User already exists');
        res.redirect('/register')
      }
    }else{
      console.log(err);
      res.redirect('/register')
    }
  });

});

app.route('/login') .get((req,res)=>{
  if(req.isAuthenticated()){
    res.send('Go on lad')
    console.log('was authenticated in /login get');
  }else{
    res.render('login');
  }

}) .post(passport.authenticate('local',{failureRedirect:'/'}),(req,res)=>{
  console.log('User was authenticated in /login post');
  res.send('Go on lad')
})

app.route('/Shoppingcart') .get((req,res)=>{
  if(req.isAuthenticated()){
    res.render('shoppingCart')
    console.log('was authenticated in /Shoppingcart get');
  }else{
    res.render('login');
  }
}) .post((req,res)=>{


});

app.listen(port,(req,res)=>{
  console.log('Connected successfuly');
});
