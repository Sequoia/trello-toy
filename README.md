## Setup
`npm install` & all that stuff.

You need to [get a trello token](https://trello.com/1/authorize?key=3743eec21374665fb406cd6c2e48f42b&name=Trello+Toy&expiration=never&response_type=token&scope=read,write) for my application and put it in trello-toy.token in your home directory.

## Usage
I have a board ID of mine hardcoded cuz this is a toy application.  To access one of your boards get the board ID (navigate to the board on trello and pull it from the URL) and pass it to the list command.

`./tt.js --help` for more info

## Progress
- [x] get - list lists
- [x] get - list cards on a list
- [x] put - Update card
- [ ] delete - Delete card
- [ ] post - Add card
- [ ] move files - Attach file to card
