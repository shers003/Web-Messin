//requiring pacakges
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const ejs = require('ejs');
const env = require('dotenv').config();
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);

const app = express();
const port = 3000;
const uri = 'mongodb://localhost:27017/messinDB'
const connection = mongoose.createConnection(uri,{useNewUrlParser:true, useUnifiedTopology:true});

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static('static'));
app.set('view engine', 'ejs');

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
  console.log(req.session.cookie);
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

  User.findOne({username:username}, (err, result)=>{
    if(!err){
      if(!result){
        user.save((err)=>{
          if(!err){
            console.log('This user is now save '+user);
            req.session.passport.user = user.username;
            res.send('u had been saved')
          }else{console.log(err);}
        });
      }else{
        console.log('User already exists');
        req.session.passport.user = result._id;
        res.redirect('/login')
      }
    }else{
      console.log(err);
      res.redirect('/register')
    }
  });

});

app.route('/login') .get((req,res)=>{
  res.render('login');
}) .post((req,res)=>{
  const saidUsername = req.body.username;
  const password = req.body.password;

  User.findOne({username:saidUsername},(err,result)=>{
    if(!err){
      if(result){
        if(result.validPassword(result,password)){
          res.send('Aye Your logged in')
        }else{
          console.log('User password incorrect');
          res.send('G u got da pass wrong')
        }
      }else{
        console.log('No user found');
        res.send('Bro you don\'t even exist')
      }
    }else{
      console.log(err);
      res.redirect('/');
    }
  });
});
app.route('/imgs') .get( (req,res)=>{
  res.render('imgs');
}) .post((req,res)=>{

});

app.listen(port,(req,res)=>{
  console.log('Connected successfuly');
});
