## Setup
`npm install` & all that stuff.

You need to [get a trello token](https://trello.com/1/authorize?key=3743eec21374665fb406cd6c2e48f42b&name=Trello+Toy&expiration=never&response_type=token&scope=read,write) for my application and put it in trello-toy.token in your home directory.

## Usage
I have a board ID of mine hardcoded cuz this is a toy application.  You can pass a board id to `lists` but not (yet) pass a list id to `cards`, so **update the hardcoded board/list id to match yours for now**.

`./tt.js --help` for more info

## Progress
- [x] get - list lists
- [x] get - list cards on a list
- [x] put - Update card
- [x] delete - Delete card
- [x] post - Add card
- [x] move files - Attach file to card

## Polish
- [x] invoke help when no args
- [x] consolidate error callbacks & remove assert (in res callback)
- [ ] allow non-hardcoded list id for card creation
- [ ] cache preferred board/list ids
