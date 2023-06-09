//jshint esversion:6
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require('mongoose');

const ejs = require("ejs");
const fs = require('fs');
const path = require('path');
require('dotenv/config');
const https = require("https");
const fetch = require("node-fetch");
const multer = require("multer");

const NodeGeocoder = require('node-geocoder');

mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// TODO
const city = "Алматы"; 
const currentYear = new Date().getFullYear();

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'uploads')
	},
	filename: (req, file, cb) => {
		cb(null, file.fieldname + '-' + Date.now())
	}
});

const upload = multer({ storage: storage });

const newsModel = require('./model');

app.get("/", function(req, res){
	const date = new Date();
	const day = date.getDate().toString().padStart(2, '0');
	const month = (date.getMonth() + 1).toString().padStart(2, '0');
	const year = date.getFullYear().toString();
	const lat = 43.235715;
	const lng = 76.807303;
	const methodISNA = 2;
	const method = 'kmdb';
	const school = 1;
	const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${lat}&longitude=${lng}&method=${methodISNA}&school=${school}`;
	const list = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
	console.log(url);

	https.get(url, (response) => {
	  let data = '';
	  response.on('data', (chunk) => {
	    data += chunk;
	  });
	  response.on('end', () => {
	    var prayerTimes = JSON.parse(data).data.timings;
	    for(var i = 0;i<6;i++){
	    	var add = 0;
	    	if(method === 'kmdb'){
	    		if(lat < 48){
	    			if(i==1) add-=3;
	    			else if(i>1 && i<5) add+=3;
	    		}else{
	    			if(i==1) add-=5;
	    			else if(i>1 && i<5) add+=5;
	    		}
	    	}
	    	var arr = prayerTimes[list[i]].split(':');
	    	var dateNamaz = new Date('2016/11/9 ' + prayerTimes[list[i]]);
	    	dateNamaz.setMinutes(dateNamaz.getMinutes() + add);
	    	var hour = dateNamaz.getHours();
	    	var min = dateNamaz.getMinutes();
	    	prayerTimes[list[i]] = (((hour<10) ? ('0' + hour):(hour)) + ":" + ((min<10)?('0' + min):(min)));
	    	//console.log(prayerTimes[list[i]]);
	    }
	    console.log(prayerTimes);

		newsModel.find().then((items) => {
			res.render('home', { 
				items: items,
				todayPrayerTimes: prayerTimes,
		        listOfTimes: list,
			});  
		}).catch((err) => {
			console.log(err);
	        res.status(500).send('An error occurred', err);
		});
	  });
	}).on('error', (err) => {
	  console.error(err);
	});
});

app.route("/news-compose")
	.get(function(req, res){
		res.render("compose");
	})
	.post(upload.single('image') ,function(req, res){
	  	const obj = {
	        title: req.body.newsTitle,
	        content: req.body.newsBody,
	        img: {
	            data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
	            contentType: 'image/png'
	        }
	    }

	    newsModel.create(obj).then((item) => {
	    	res.redirect("/"); 
	    }).catch((err) => {
	    	console.log(err);
	    });
	});

app.get("/news/:newsID", function(req, res){
	const requestedID = req.params.newsID;
	console.log(requestedID);

	newsModel.findOne({_id: requestedID}).then((news) => {
		res.render("news", {news});
	}).catch((err)=>{
		console.error(err);
	});
});

////////////////////////////////////// FOOTER NAV BAR BUTTONS start

app.get("/store", function(req, res){
	res.render("store");
});


app.get("/services", function(req, res){
	res.render("services");
});

app.get("/profile", function(req, res){
	res.render("profile");
});

app.get("/holidaysCalendar", function(req, res){
	const HijriDate = require('hijri-date').default;

	// Array of Islamic holidays with their corresponding month and day in the Islamic calendar
	const holidays = [
	  { name: 'Day of Ashura', month: 1, monthName: 'Muharram', day: 10 },
	  { name: 'Mawlid an-Nabi', month: 3, monthName: 'Rabi` al-Awwal', day: 12 },
	  { name: 'Night Raghaib', month: 7, monthName: 'Rajab', day: 1 },
	  { name: 'Miraj', month: 7, monthName: 'Rajab', day: 27 },
	  { name: 'Night of Baraat', month: 8, monthName: 'Sha`ban', day: 15 },
	  { name: 'Ramadan', month: 9, monthName: 'Ramadan', day: 1 },
	  { name: 'Night al-Qadr', month: 9, monthName: 'Ramadan', day: 27 },
	  { name: 'Day of Arafat', month: 12, monthName: 'Dhul-Hijjah', day: 9 },
	  { name: 'Eid al-Adha', month: 12, monthName: 'Dhul-Hijjah', day: 10 },
	];

	// Get the current Islamic date
	const today = new HijriDate();

	// Find the next holiday
	let nextHoliday = null;
	for (let i = 0; i < holidays.length; i++) {
	  const holiday = holidays[i];
	  const holidayDate = new HijriDate(today.year, holiday.month - 1, holiday.day);
	  if (holidayDate > today) {
	    nextHoliday = holiday;
	    break;
	  }
	}

	// Create an array of holidays starting from the next holiday
	const holidayYear = nextHoliday ? today.year : today.year + 1;
	const remainingHolidays = nextHoliday
	  ? holidays.slice(holidays.indexOf(nextHoliday)-1)
	  : holidays;
	const holidaysThisYear = remainingHolidays.map(holiday => {
	  const holidayDate = new HijriDate(holidayYear, holiday.month - 1, holiday.day);
	  return {
	    name: holiday.name,
	    date: holidayDate.toGregorian(),
	  };
	});

	// Add the holidays of the following year
	const holidaysNextYear = holidays.map(holiday => {
	  const holidayDate = new HijriDate(holidayYear + 1, holiday.month - 1, holiday.day);
	  return {
	    name: holiday.name,
	    monthName: holiday.monthName,
	    month: holiday.month,
	    day: holiday.day,
	    date: holidayDate.toGregorian(),
	  };
	});

	// Merge the arrays and sort by date
	const allHolidays = [...holidaysThisYear, ...holidaysNextYear].sort((a, b) => a.date - b.date);

	console.log(allHolidays);
	res.send("Holidays");
});

////////////////////////////////////// FOOTER NAV BAR BUTTONS end


//////////////////////////////////////MENU BUTTONS IN MAIN PAGE start

app.get("/first-button-in-main-menu", function(req, res){
	res.render("menu/firstButton");
});

app.get("/second-button-in-main-menu", function(req, res){
	res.render("menu/secondButton");
});

app.get("/third-button-in-main-menu", function(req, res){
	res.render("menu/thirdButton");
});

app.get("/fourth-button-in-main-menu", function(req, res){
	res.render("menu/fourthButton");
});

app.get("/fifth-button-in-main-menu", function(req, res){
	res.render("menu/fifthButton");
});

app.get("/sixth-button-in-main-menu", function(req, res){
	res.render("menu/sixthButton");
});

//////////////////////////////////////MENU BUTTONS IN MAIN PAGE end
var port = process.env.PORT || '3000'
app.listen(port, () => {
  console.log('Server listening on port 3000');
});

