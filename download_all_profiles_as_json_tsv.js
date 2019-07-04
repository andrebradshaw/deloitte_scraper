var reg = (o, n) => o ? o[n] : '';
var cn = (o, s) => o ? o.getElementsByClassName(s) : console.log(o);
var tn = (o, s) => o ? o.getElementsByTagName(s) : console.log(o);
var gi = (o, s) => o ? o.getElementById(s) : console.log(o);
var rando = (n) => Math.round(Math.random() * n);
var delay = (ms) => new Promise(res => setTimeout(res, ms));
var unq = (arr) => arr.filter((e, p, a) => a.indexOf(e) == p);
var delay = (ms) => new Promise(res => setTimeout(res, ms));
var dateString = (s) => new Date(s).toString().replace(/^\S+/, '').replace(/\d\d:\d\d.+/, '').trim().replace(/(?<=[a-zA-Z]{3})\s\d+/, '');

function downloadr(arr2D, filename) {
  var data = /\.json$|.js$/.test(filename) ? JSON.stringify(arr2D) : arr2D.map(el=> el.reduce((a,b) => a+'\t'+b )).reduce((a,b) => a+'\r'+b);
  var type = /\.json$|.js$/.test(filename) ? 'data:application/json;charset=utf-8,' : 'data:text/plain;charset=utf-8,';
  var file = new Blob([data], {    type: type  });
  if (window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveOrOpenBlob(file, filename);
  } else {
    var a = document.createElement('a'),
    url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 10);
  }
}

async function getXMLasDOC(url){
  var res = await fetch(url);
  var text = await res.text();
  var doc = new DOMParser().parseFromString(text,'text/html');
  return doc;
}

async function loopThroughUrls(){
  var textPlease = (o) => o ? o.innerText : '';
  var containArr = [];
  var sitemapDoc = await getXMLasDOC('https://www2.deloitte.com/sitemap_index.xml');
  var sitemapLinks = await Array.from(tn(sitemapDoc,'loc')).map(el=> el.innerText);
  for(var i=0; i<sitemapLinks.length; i++){
    var doc = await getXMLasDOC(sitemapLinks[i]);
    var links = Array.from(tn(doc,'url')).map(el=> {
      var l = textPlease(tn(el,'loc')[0]);
      var t = textPlease(tn(el,'lastmod')[0]);
      return [l,t];
      }).filter(el=> /en\/profile/i.test(el[0]));
    links.forEach(el=> containArr.push(el));
    await delay(rando(100)+1001);
  }
  return containArr;
}


function parseProfile(profile,url,timestamp){
  var textPlease = (o) => o ? o.innerText : '';
  var fullname = textPlease(cn(profile,'primary-headline white-title')[0]);
  var title = textPlease(tn(profile, 'h3')[0]);
  var contactHead = cn(profile,'contact-links-wrapper')[0];
  var socialHead = contactHead ? cn(contactHead,'contact-links social-icons')[0] : null;
  var emplInfoHead = gi(profile,'employee-profile__info-section') ? Array.from(cn(gi(profile,'employee-profile__info-section'),'body-copy')).map(el=> textPlease(el)) : [];
  var desc = textPlease(gi(profile,'employee-profile__desc')).trim().replace(/\t/g, ' ');
  var skills = gi(profile,'employee-profile__related-topics') ? Array.from(tn(gi(profile,'employee-profile__related-topics'),'li')).map(el=> textPlease(el).trim()) : [];
  var socialArr = socialHead ? Array.from(tn(socialHead,'a')).map(el=> [el.href,el.title]) : [];
  var socialLinks = socialArr.length > 0 ? socialArr.filter(el=> el[1] != 'LinkedIn').map(el=> el[0]).toString() : '';
  var linkedin = reg(socialArr.filter(el=> el[1] == 'LinkedIn')[0],0);
  var emailCont = contactHead ? cn(contactHead,'icon icon-email')[0] : null;
  var phoneCont = contactHead ? cn(contactHead,'icon icon-phone')[0] : null;
  var email = emailCont ? textPlease(emailCont.parentElement).trim() : '';
  var phone = phoneCont ? textPlease(phoneCont.parentElement).replace(/\+/, '').trim() : '';
  var twitterCont = cn(profile,'twitter-component')[0] ? cn(profile,'twitter-component')[0] : null;
  var t_btnCont = twitterCont ? cn(twitterCont,'content-group')[0] : null;
  var twitterHandle = t_btnCont ? tn(t_btnCont,'a')[0].href : '';
  var addressInfo = {street1: emplInfoHead[0], street2: emplInfoHead[1], city: emplInfoHead[2], state: emplInfoHead[3], country: emplInfoHead[4], zipcode: emplInfoHead[5]};
  var outputObj = {
    urlSource: url,
    lastUpdate: dateString(timestamp),
    fullName: fullname,
    title: title,
    email: email,
    phone: phone,
    address: addressInfo,
    social: socialArr,
    skills: skills,
    desc: desc,
    twitter: twitterHandle,
    linkedin: linkedin 
  };
  var tsvLine = [url,dateString(timestamp),fullname,title,email,phone,emplInfoHead[0], emplInfoHead[1], emplInfoHead[2], emplInfoHead[3], emplInfoHead[4], emplInfoHead[5],skills.toString(), desc, twitterHandle, linkedin, socialLinks];
  return {obj: outputObj, tsv: tsvLine};
}

async function loopThroughProfiles(links){
  var tsvHeader = ['Source Url','Last Updated','Full Name','Title','Email','Phone','Street 1','Street 2','City','State','Country','Zip Code','Skills','Description','Twitter','LinkedIn','Social Links'];
  var jsonCont = [];
  var tsvCont = [tsvHeader];
  for(var i=0; i<links.length; i++){
    var prof = await getXMLasDOC(links[i][0]);
    var profOb = parseProfile(prof,links[i][0],links[i][1]);
    jsonCont.push(profOb.obj);
    tsvCont.push(profOb.tsv);
    await delay(rando(100)+1001);
  }
  console.log(JSON.stringify(jsonCont));
  console.log(JSON.stringify(tsvCont));
  downloadr(tsvCont, 'deloitte_Profiles.tsv');
  downloadr(jsonCont, 'deloitte_Profiles.json');
}

async function initDeloitteScraper(){
  var profiles = await loopThroughUrls();
  console.log(JSON.stringify(profiles));
  await loopThroughProfiles(profiles);
}

initDeloitteScraper();
