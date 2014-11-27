#!/usr/bin/env node
var program = require('commander');
var request = require('superagent');
var Table = require('cli-table');
var fs = require('fs');
var path = require('path');
var token = getAppToken();

//app settings//
var appkey = '3743eec21374665fb406cd6c2e48f42b'; //application key
var board = 'AuDVdIcE'; //hardcoded board id ¯\_(ツ)_/¯

//program//
program
  .command('lists [id]')
  .description('get lists for board with [id] (or default board)')
  .action(function(boardId){
    var id = (typeof boardId === 'string') ? boardId : board;
    trequest('GET', 'boards/'+id+'/lists')
      .query({cards:'open'})
      .end(function(res){
        //Table definition (headings)
        var t = new Table({ head: ['Column','ID', 'Open Cards'] });
        res.body.forEach(function(col){
          //table data
          t.push([col.name, col.id, col.cards.length]);
        });
        console.log(t.toString());
      });
  });

program.parse(process.argv);
////////util/////////

//returns an app token string or prompts user to set one
function getAppToken(){
  var tokenName =  'trello-toy.token';
  var tokenPath = path.join(getHomeDir(), tokenName);
  var getTokenURL = 'https://trello.com/1/authorize?key=3743eec21374665fb406cd6c2e48f42b&name=Trello+Toy&expiration=never&response_type=token&scope=read,write';
  var token;

  try{
    token = fs.readFileSync(tokenPath, 'utf8').trim();
  }catch(e){
    switch(e.code){
      case 'EACCES':
        console.log('Can\'t read %s Check file permissions.', tokenPath);
        break;
      case 'ENOENT':
        console.log('Token file (%s) does not exist!', tokenPath);
        console.log('Please go to %s', getTokenURL);
        console.log('& get a token string, then put it in a file called %s', tokenName);
        console.log('in your home directory (%s)', getHomeDir());
        break;
      default:
        throw e;
    }
    process.exit(1);
  }
  
  return token;
}
//taken from http://stackoverflow.com/questions/9080085/node-js-find-home-directory-in-platform-agnostic-way
function getHomeDir() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

//adds my auth boilerplate to the request
function trequest(action,path){
  return request(action, 'https://api.trello.com/1/' + path)
    .query({'key': appkey})
    .query({'token': token});
}
