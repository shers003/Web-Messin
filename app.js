/************* A place where I mess around ****************/
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
//To let user upload files
const multer = require('multer')
const fs = require('fs')

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
//Letting user add files
const upload = multer({dest:__dirname+'/static/posts'})


/**************** Setting up database *********************/
mongoose.connect(uri,{useNewUrlParser:true, useUnifiedTopology:true},(err)=>{
  if(!err){
    console.log('connected succesfuly to mongo');
  }else{
    console.log(err);
  }
});


/********************* Image/caption collections ****************/
const postSchema = new mongoose.Schema({
  user:String,
  caption:String,
  image:{
    data:Buffer,
    contentType:String,
    filename:String
  }
})

const Post = new mongoose.model('post',postSchema);

/*************** user collection *****************/
const userSchema = new mongoose.Schema({
  username:String,
  password:String,
  posts:[postSchema]
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
  if(req.session.page_views){
   req.session.page_views++;
  } else {
   req.session.page_views = 1;
}
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
            req.session.user = result.username;
            req.session.expires = new Date(Date.now() + 3600000);
            res.cookie('user',user.username).redirect('/imgs')
          }else{console.log(err);}
        });
      }else{
        console.log('User already exists');
        if(result.validPassword(result,req.body.password)){
          req.session.user = result.username;
          req.session.expires = new Date(Date.now() + 3600000);
          res.cookie('user',result.username, {maxAge:3600000}).redirect('/imgs')
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
          req.session.user = result.username;
          req.session.expires = new Date(Date.now() + 3600000);
          res.cookie('user',result.username, {maxAge:3600000}).redirect('/imgs');
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
  const user = req.session.user;

  Post.find({},(err,results)=>{
    if(!err){
      res.render('imgs',{userInputs:results,user:user})
    }else{console.log(err);res.send(err)}
  });


}) .post(upload.single('image'), (req,res)=>{
  const userCaption = req.body.caption;
  const userImg = req.file;

  User.findOne({username:req.cookies.user},(err,result)=>{
    var i =0;
    if(!err){
      if(result){

        const post = new Post({
          user:result.username,
          caption: userCaption,
          image:{
            data:fs.readFileSync(userImg.path),
            contentType:'image.png',
            filename:userImg.filename
          }
        });

        post.save((err)=>{
          if(!err){
              console.log('post has been saved');
          }else{
            console.log(err);
          }
        });

        for(i;i<result.posts.length;i++){

        }
        result.posts[i] = post;
        result.save((err)=>{
          console.log('Post has been saved to user ' + result.username);
          res.redirect('/imgs')
        })
      }else{
        console.log('User not found');
        res.redirect('/')
      }
    }else{
      console.log(err);
      res.redirect('/')
    }
  })

});

app.route('/userImgs')

.get(checkUser,(req,res)=>{

  const user = req.cookies.user

  Post.find({user:user},(err,results)=>{
    if(!err){
      res.render('userimgs',{userInputs:results,user:user})
    }else{console.log(err);res.send(err)}
  });
});


app.get('/logout',(req,res)=>{
  res.clearCookie('user');
  req.session.destroy(()=>{
    console.log('session is destroyed');
  });
  res.redirect('/');
});

app.post('/delete',(req,res)=>{
  const postId = req.body.file;
  const id = req.body.user;
  const path = __dirname+'/static/posts/'+postId;
  Post.deleteOne({_id:id},(err,post)=>{
    if(!err){
      if(post){
          fs.unlink(path,(err)=>{
            if(!err){
              console.log(post+' '+postId+' Deleted');
              res.redirect('/userImgs')
            }else{
              console.log(err);
            }
          })
      }
    }else{
      console.log(err);
    }
  });
});

app.listen(port,(req,res)=>{
  console.log('Connected successfuly');
});
