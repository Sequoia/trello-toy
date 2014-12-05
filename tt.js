#!/usr/bin/env node
var program = require('commander');
//Checks if the first argument is a valid command
//outputs error message if not
program.commandPassed = function(){
  if(this.args === undefined || typeof this.args[0] !== 'object'){
    console.log(chalk.red('command "%s" not found'), this.args[0]);
    return false;
  }
  return true;
};
var request = require('superagent');
var Table = require('cli-table');
var fs = require('fs');
var path = require('path');
var chalk = require('chalk');
var wrap = require('wordwrap');
var token = getAppToken();
var util = require('util');
var assert = require('assert');
var confirm = require('confirm');
var mimetype = require('mimetype');
var prompt = require('prompt');
prompt.message = '';
prompt.delimiter = '';

//app settings//
var appkey = '3743eec21374665fb406cd6c2e48f42b'; //application key
var board = 'AuDVdIcE'; //hardcoded board id ¯\_(ツ)_/¯
var todo = '4f10a1e5102115c8280393fc'; //todo list on the board above

//program//
program
  .command('lists [id]')
  .usage('[id]')
  .description('get lists for board with [id] (or default board)')
  .action(function(boardId){
    var id = (typeof boardId === 'string') ? boardId : board;
    trequest('GET', 'boards/'+id+'/lists')
      .query({cards:'all'})
      .end(function(res){
        //Table definition (headings)
        var t = new Table({ head: ['Column','ID', 'Cards'] });
        res.body.forEach(function(col){
          //table data
          t.push([col.name, col.id, col.cards.length]);
        });
        console.log(t.toString());
      });
  });

program
  .command('cards <id>')
  .usage('<id>')
  .description('get cards for list with <id>')
  .action(function(id){
    assert.equal(typeof id, 'string', 'list id required for `cards <id>`');
    trequest('GET', 'lists/'+id+'/cards/all')
      .end(function(res){
        assert(res.ok,'HTTP request failed. check list id.');
        //Table definition (headings)
        var widths = [20,20,20,50]; //used for table format & word wrapping
        var t = new Table({ head: ['Title', 'Description','Labels', 'url/id'], colWidths: widths });
        res.body.forEach(function(card){
          //table data
          t.push([
            wrap(widths[0]-2)(card.name),
            wrap(widths[1]-2)(card.desc),
            //join all the label names with colors
            card.labels.map(function(label){
              var color = label.color;
              var bg = 'bg'+color.charAt(0).toUpperCase()+color.slice(1);
              //chalk doesn't have orange :/
              //TODO this will surely break with more colors :)
              bg = bg.replace('Orange','White');
              return chalk[bg](wrap(widths[2]-2)(label.name));
            }).join('\n'),
            wrap(widths[3]-2)(card.url + '\n' + card.id)
          ]);
        });
        console.log(t.toString());
      });
  });

program
  .command('update <cardid> <field> <value>')
  .usage('<cardid> <field> <value>')
  .description('update a field on a card')
  .on('--help',function(){
    ['Examples:',
    ' $ tt update 57298375 closed true',
    ' $ tt update 57298375 labels "blue,red,green"',
    ' $ tt update 57298375 name "New Card Name"',
    '',
    'Full list of valid values can be found here:',
    'https://trello.com/docs/api/card/index.html#put-1-cards-card-id-or-shortlink']
    .map(function(str){console.log(str);});
  })
  .action(function(id, field, value){
    [].slice.call(arguments,0,3).forEach(function(arg){
      assert.equal(typeof arg, 'string', 'arguments must be strings');
    });
    //have to do this to ge
    var queryObj = {};
    queryObj[field] = value;
    trequest('PUT', 'cards/'+id)
      .send(queryObj)
      .end(function(res){
        if(res.ok){
          console.log(chalk.green('card ' + id + ' updated successfully'));
        }else{
          console.error(chalk.red('http request failed.'));
          console.error(chalk.red(res.error.text));
          process.exit(res.status);
        }
      });
  });

program
  .command('delete <cardid>')
  .usage('<cardid>')
  .description('delete a card by ID')
  .action(function(id){
    confirm({
      positive: 'y',
      negative: 'n',
      query: 'Are you sure you want to delete card ' + id + '? y/n'
    },function(err,yes){
      if(!err && yes){
        trequest('DELETE', 'cards/'+id)
          .end(function(res){
            if(res.ok){
              console.log(chalk.green('card ' + id + ' deleted successfully'));
            }else{
              console.error(chalk.red('http request failed.'));
              console.error(chalk.red(res.error.text));
              process.exit(res.status); //TODO change to response message
            }
          });
      }
    });
  });

program
  .command('card')
  .description('create a card')
  .action(function(){
    prompt.start();
    prompt.get(['name', 'description'], function(err, res){
      trequest('POST', 'cards')
        .query({idList: todo}) //TODO this should not be hardcoded
        .query({name : res.name})
        .query({desc : res.description})
        .end(function(res){
          if(res.ok){
            console.log(chalk.green('Success. new card id: ' + res.body.id));
            console.log(res.body.url);
          }else{
            console.error(chalk.red('http request failed.'));
            console.error(chalk.red(res.error.text));
            process.exit(res.status);
          }
        });
    });
  });

program
  .command('attach <cardid> <filename>')
  .description('attach an image to a card')
  .action(function(id, filename){
    trequest('POST', 'cards/'+id+'/attachments')
    .attach('file', filename)
    .end(function(res){
      if(res.ok){
        console.log(chalk.green('Success.'));
      }else{
        console.error(chalk.red('http request failed.'));
        console.error(chalk.red(res.error.text));
        process.exit(res.status);
      }
    });
  });

program.parse(process.argv);

//help if no command passed
if (!program.args.length || !program.commandPassed()) program.help();

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
    .query({'token': token})
    .on('error',handleHttpError);
}

function handleHttpError(a,b,c){
  console.log(a);
  console.log(b);
  console.log(c);
}
