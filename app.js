//requiring pacakges
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const ejs = require('ejs');
const env = require('dotenv').config();
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
// Learnt about this at https://www.tutorialspoint.com/expressjs/expressjs_cookies.htm
const cookieParser = require('cookie-parser');

const app = express();
const port = 3000;
const uri = 'mongodb://localhost:27017/messinDB'
const connection = mongoose.createConnection(uri,{useNewUrlParser:true, useUnifiedTopology:true});
// took inspiration from https://levelup.gitconnected.com/everything-you-need-to-know-about-the-passport-local-passport-js-strategy-633bbab6195
const sessionstore = new MongoStore({mongooseConnection: connection, collection:'sessions'})
const sess = {
  secret: process.env.SESSIONSECRET,
  resave:false,
  saveUninitialized:false,
  store:sessionstore
};
/**************** Coustom middleware ****************/
const checkUser = (req,res,next)=>{
  if (req.cookies.user){
    next()
  }else{
    res.redirect('/');
  }
};

/**************** middleware ****************/
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static('static'));
app.use(cookieParser());
app.use(session(sess));
//read up on what the .set method deos
app.set('view engine', 'ejs');






/**************** Setting up database *********************/
mongoose.connect(uri,{useNewUrlParser:true, useUnifiedTopology:true},(err)=>{
  if(!err){
    console.log('connected succesfuly to mongo');
  }else{
    console.log(err);
  }
});

/*************** user collection *****************/
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

/********************* Image/caption collections ****************/
const postSchema = new mongoose.Schema({
  caption:String,
  imageURL:String
})

const Post = new mongoose.model('post',postSchema);

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

  User.findOne({username:username}, (err, result)=>{
    if(!err){
      if(!result){
        user.save((err)=>{
          if(!err){
            console.log('This user is now save '+user);
            res.cookie('user',user.username).redirect('/imgs')
          }else{console.log(err);}
        });
      }else{
        console.log('User already exists');
        if(result.validPassword(result,req.body.password)){
          res.cookie('user',result.username).redirect('/imgs')
        }else{
          console.log('User password incorrect');
          res.send('G u got da pass wrong')
        }
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
          res.cookie('user',result.username).redirect('/imgs');
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
app.route('/imgs') .get( checkUser, (req,res)=>{
  const user = req.cookies.user
  console.log(req.cookies);
  Post.find({},(err,results)=>{
    if(!err){
      res.render('imgs',{userInputs:results,user:user})
    }else{console.log(err);res.send(err)}
  });


}) .post((req,res)=>{
  const userCaption = req.body.caption;
  const userImg = req.body.imgURL;

  const post = new Post({
    caption: userCaption,
    imageURL: userImg
  });

  post.save((err)=>{
    if(!err){
        console.log('post has been saved');
        res.redirect('/imgs');
    }else{

    }
  })

});

app.get('/logout',(req,res)=>{
  res.clearCookie('user');
  console.log(req.cookies);
  res.send('Clear cookie');
});

app.listen(port,(req,res)=>{
  console.log('Connected successfuly');
});
