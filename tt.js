#!/usr/bin/env node
//TODO break this out into per command files
var program = require('commander');
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
var board = 'AuDVdIcE'; //update this for your board TODO externalize
var todo = '4f10a1e5102115c8280393fc'; //update this for your list TODO externalize

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
        check4error(res);
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
        check4error(res);
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
        check4error(res);
        console.log(chalk.green('card ' + id + ' updated successfully'));
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
            check4error(res);
            console.log(chalk.green('card ' + id + ' deleted successfully'));
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
          check4error(res);
          console.log(chalk.green('Success. new card id: ' + res.body.id));
          console.log(res.body.url);
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
      check4error(res);
      console.log(chalk.green('Success.'));
    });
  });

program
  .command('boards')
  .option('-c, --closed','show closed boards')
  .description('list boards (open by default)')
  .action(function(){
    //TODO this whole thing is screwed up there should be an easier way to get options in subcommands
    if(program.args.length > 1){
      console.error(chalk.red('`boards` does not take unnamed arguments'));
      process.exit(1);
    }
    var args = program.args[0];

    var req = trequest('GET', 'members/me/boards');
    if(args.closed) req.query({'filter':'closed'});
    else req.query({'filter':'open'});

    req.end(function(res){
      check4error(res);
      showBoardsTable(res.body);
    });
    
    function showBoardsTable(boards){
      var t = new Table({ head: ['Name','ID'] });
      boards.forEach(function(col){
        //table data
        t.push([col.name, col.id]);
      });
      console.log(t.toString());
    }
  });

program
  .command('close <boardid>')
  .description('close board')
  .action(function(boardId){
    trequest('PUT', 'boards/'+boardId+'/closed')
      .query({'value':true})
      .end(function(res){
        check4error(res);
        console.log(chalk.green('Board closed'));
      });
  });


program.parse(process.argv);

//help if no command passed
if (!program.args.length) program.help();

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

//check response for error, log & exit if error present
function check4error(res){
  if(res.ok) return;
  console.error(chalk.red('http request failed.'));
  console.error(chalk.red(res.error.text));
  process.exit(1);
}
