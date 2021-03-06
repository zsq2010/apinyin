var allen = {}
//namespace for my ime
allen.input = {
  current: null,							//point to current input box
  pinyin: '',									//current pinyin
  all_word: null,							//all words list
  candidates: new Array(),		//all candidates matched for current pinyin
  cand_str: '',								//candidates for current page
  max_length: 20,							//max pinyin length, not used currently
  match_word: new Array(),		//stack for selected words
  match_str: '',							//string of selected words
  match_pinyin: new Array(),	//stack for matched pinyin
  match_length: 0,						//length of pinyin that has been matched
  length_arr: new Array(),		//to caculate length of pinyin
  start: -1,									//start index of candidates
  page: 0,										//current page
	page_size: 5,								//pagee size
  mode: 'chinese',						//ime mode, 'chinese', 'english' or 'url'
	
  //keydown function, to detect some special key
	keydown: function(keyCode) {	
    if(this.mode == 'url') {			//in url mode
      switch(keyCode) {
      case 8:		//'backspace' pressed, delete something
        if(this.pinyin == '') {
          return true;
        } else {
          this.pinyin = this.pinyin.substr(0, this.pinyin.length - 1);
          $("#allen-input-pinyin").html(this.pinyin);
          return false;
        }
        break;
      }
    } else {
      switch(keyCode) {
      case 8:		//'backspace' pressed, delete something
        if(this.match_pinyin.length > 0) {
					//matched stack not empty, pop selected word
          this.pinyin = this.match_pinyin.pop() + this.pinyin;
          this.match_word.pop();
          this.page = 0;
          this.showCand();
          return false;
        } else {
					//matched stack empty, delete pinyin
          if(this.pinyin == '') {
            return true;
          } else {
            this.pinyin = this.pinyin.substr(0, this.pinyin.length - 1);
            this.page = 0;
            this.showCand();
            return false;
          }
        }
        break;
      }
    }
  },
	//keypress, detect most keys
  keypress: function(keyCode) {
    if(keyCode == 8) {		//eat 'backspace'
      if(this.pinyin == '') {
        return true;
      } else {
        return false;
      }
    }
    if(this.mode == 'url') {		//in url mode
      switch(keyCode) {
      case 13:		//'enter' pressed
      case 32:		//'space' pressed, enter the url and switch into chinese mode
        this.current.insertAtCaret(this.pinyin);
        this.current.focus();
        this.clearAll();
        this.mode = 'chinese';
        return false;
        break;
      default:		//input url
        var keyChar = String.fromCharCode(keyCode);
        keyChar = keyChar.toLowerCase();
        var lowerKeyCode = keyChar.charCodeAt(0);
        this.pinyin += keyChar;	
        $("#allen-input-pinyin").html(this.pinyin);
        return false;
        break;
      }
    } else {		//chinese mode
      switch(keyCode) {
      case 13:		//'enter' pressed, enter the pinyin directly
        if(this.pinyin == '') {
          return true;
        } else {
          this.current.insertAtCaret(this.pinyin);
          this.current.focus();
          this.clearAll();
          return false;
        }
        break;
      case 8:		//'backspace' pressed, delete something
        if(this.pinyin == '') {
          return true;
        } else {
          return false;
        }
        break;
      case 32:		//'space' pressed, pick the first word
        if(this.pinyin == '') {
          return true;
        } else {
          if(this.candidates.length > 0) {
            this.pickWord(0);
          }
          return false;
        }
        break;
      case 45:	// '-' pressed, prev page
        this.prevPage();
        return false;
      case 61:	// '=' pressed, next page
        this.nextPage();
        return false;
      case 46:	// '.' pressed, change into url mode
        if(this.pinyin == '') {
          return true;
        } else {
          this.pinyin += '.';
          $("#allen-input-pinyin").html(this.pinyin);
          this.mode = 'url';
          $("#allen-input-cand").html('已进入网址模式');
          return false;
        }
        break;
      default:
        //alert(keyCode);
        var keyChar = String.fromCharCode(keyCode);
        keyChar = keyChar.toLowerCase();
        var lowerKeyCode = keyChar.charCodeAt(0);
        if(lowerKeyCode >= 97 && lowerKeyCode <= 122) {		//'a-z' pressed, add to pinyin and show candidates
          this.pinyin += keyChar;
          this.page = 0;
          this.showCand();
          //$("#allen-input-pinyin").html(this.pinyin);
          return false;
        } else if(lowerKeyCode >= 49 && lowerKeyCode <= 49 + this.page_size - 1) {
					//number pressed, pick word
          if(this.pinyin == '') {
            return true;
          } else {
            if(this.candidates != '') {
              if(lowerKeyCode - 49 < this.candidates.length) {
                this.pickWord(lowerKeyCode - 49);
                this.cand_len = 0;
              }
            }
            return false;
          }
        } else {
          return true;
        }
        break;
      }
    }
  },
	//clear all settings and words
  clearAll: function() {
    this.pinyin = '';
    delete this.candidates;
    this.candidates = new Array();
    delete this.match_word;
    this.match_word = new Array();
    delete this.match_pinyin;
    this.match_pinyin = new Array();
    this.cand_str = '';
    this.cand_len = 0;
    this.start = -1;
    this.page = 0;
    this.match_length = 0;
    $("#allen-input-match").html('');
    $("#allen-input-pinyin").html('');
    $("#allen-input-cand").html('');
		$("#allen-input-wrapper").hide();
  },
	//calculate pinyin length of the picked word
  posLen: function(index) {
    var cand_pos = this.page * this.page_size + index;
    var i;
    var tmp_len = this.length_arr[0].len;
    /*myDebug('---');
    for(i = 0; i < this.length_arr.length; i++) {
      myDebug(this.length_arr[i].pos + ':' + this.length_arr[i].len);
    }
    myDebug('---');*/
		//this loop can be faster
    for(i = 1; i < this.length_arr.length; i++) {
      if (this.length_arr[i].pos == cand_pos) {
        return this.length_arr[i].len;
      } else if (this.length_arr[i].pos > cand_pos) {
        return tmp_len;
      } else {
        tmp_len = this.length_arr[i].len;
      }
    }
    return tmp_len;
  },
	//pick word from cadidates list
  pickWord: function(num) {
    var index = this.page * this.page_size + num;
    if(this.candidates.length > index) {
      var pos_len = this.posLen(index);
      if(this.pinyin.length == pos_len) {		//last pinyin, update textarea
        this.current.insertAtCaret(this.match_str + this.candidates[index]);
        this.current.focus();
        this.clearAll();
      } else {		//pick word into stack
        this.match_word.push(this.candidates[index]);
        this.match_pinyin.push(this.pinyin.substr(0, pos_len));
        this.pinyin = this.pinyin.substr(pos_len, this.pinyin.length - pos_len);
        this.displayCand();
        this.page = 0;
        this.showCand();
      }
    }
  },
	//show candidates
  showCand: function() {
    if(this.pinyin == '') {
      this.clearAll();
    } else {
			$("#allen-input-wrapper").show();
      $("#allen-input-pinyin").html(this.pinyin);
      this.search_length = this.pinyin;
      this.searchTable(this.pinyin.length);
      this.createCand();
    }
  },
	//search table for word matching current pinyin
  searchTable: function(str_len) {
    this.start = -1;
    this.end = -1;
    var low = 0;
    var high = this.all_word.length - 1;
    //var str_len = this.search_length;
    var pattern = new RegExp("[^a-z';]");
		//search for first match of the pinyin
    while (low <= high) {
      var mid = Math.floor((low + high) / 2);
      var code = this.all_word[mid].substr(0, this.all_word[mid].search(pattern));
      if (code.substr(0, str_len) == this.pinyin.substr(0, str_len)) {
        this.start = mid;
        this.match_length = str_len;
        high = mid - 1;
      } else if (code.substr(0, str_len) > this.pinyin.substr(0, str_len)) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
		//search for the last match of the pinyin
    if (this.start == -1) {
      this.end = -1;
			//removed, too slow and use too much memmory
      /*if (str_len > 1) {
        //this.search_length--;
        this.searchTable(str_len - 1);
      } else {
        this.end = -1
      }*/
    } else {
      low = this.start;
      high = this.all_word.length - 1;
      while (low <= high) {
        var mid = Math.floor((low + high) / 2);
        var code = this.all_word[mid].substr(0, this.all_word[mid].search(pattern));
        if (code.substr(0, str_len) == this.pinyin.substr(0, str_len)) {
          this.end = mid;
          low = mid + 1;
        } else if (code.substr(0, str_len) > this.pinyin.substr(0, str_len)) {
          high = mid - 1;
        }
      }
    }
    //alert(this.start + ':' + this.end);
  },
	//append more candidates for shorter pinyin
  appendMore: function() {
    //myDebug('appendMore called');
    delete this.length_arr;
    this.length_arr = new Array();
    var str_len = this.match_length < this.pinyin.length ? this.pinyin.length : this.match_length - 1;
    this.length_arr.push({
      len: eval(this.match_length),
      pos: 0
    });
		//loop until done
    while (str_len > 0) {
      var low = 0;
      var high = this.all_word.length - 1;
      var pattern = new RegExp("[^a-z';]", "g");
      while (low <= high) {
        var mid = Math.floor((low + high) / 2);
        var code = this.all_word[mid].substr(0, this.all_word[mid].search(pattern));
        //myDebug(code + ':' + this.pinyin.substr(0, str_len));
        if (code == this.pinyin.substr(0, str_len)) {
          var index = mid;
          var tmp_cand = this.all_word[index].replace(/[a-z';]+/, '').split(',');
          this.length_arr.push({
            len: eval(str_len),
            pos: eval(this.candidates.length)
          });
          this.candidates = this.candidates.concat(tmp_cand);
          high = mid - 1;
          //myDebug(code);
        } else if (code.substr(0, str_len) >= this.pinyin.substr(0, str_len)) {
          high = mid - 1;
        } else {
          low = mid + 1;
        }
      }
      str_len--;
    }
  },
	//after index found, created candidates list
  createCand: function() {
    delete this.candidates;
    if(this.start >= 0) {
      this.candidates = this.all_word[this.start].replace(/[a-z';]+/, '').split(',');
      var code_index = this.start + 1;
      while (code_index <= this.end) {
        this.candidates = this.candidates.concat(this.all_word[code_index].replace(/[a-z';]+/, '').split(','));
        code_index++;
      }
    } else {
      this.candidates = new Array();
    }
    this.appendMore();
    this.displayCand();
  },
	//display candidates as html
  displayCand: function() {
    var index = this.page_size * this.page;
    this.cand_str = '';
    this.match_str = '';
    //this.candidates = new Array();
    var i = 1;
    while (i <= this.page_size && index < this.candidates.length) {
      if (i == 1) {
        this.cand_str += '<span class="first" onclick="javascript:allen.input.pickWord(0);">';
      } else {
        this.cand_str += '<span onclick="javascript:allen.input.pickWord(' + (i - 1) + ');">';
      }
      this.cand_str += i + '.' + this.candidates[index] + '</span>';
      //this.candidates[i - 1] = this.candidates[index];
      index++;
      i++;
    }
    for (i = 0; i < this.match_word.length; i++) {
      this.match_str += this.match_word[i];
    }
    $("#allen-input-match").html(this.match_str);
    $("#allen-input-pinyin").html(this.pinyin);
    $("#allen-input-cand").html(this.cand_str);
  },
	//prev page
  prevPage: function() {
    if(this.page > 0) {
      this.page--;
      this.displayCand();
    }
  },
	//next page
  nextPage: function() {
    if((this.page + 1) * this.page_size < this.candidates.length) {
      this.page++;
      this.displayCand();
    }
  }
};

//extend jquery for the input to be used
$.fn.extend({
  allenInput: function() {
    $(this).setCaret();
    $(this).focus(function() {
      allen.input.current = $(this);
      return true;
    });
    $(this).keypress(function(e) {
      return allen.input.keypress(e.which);
    });
    $(this).keydown(function(e) {
      return allen.input.keydown(e.keyCode);
    });
  }
});

//import all words
$(document).ready(function(){
  //$('body').append('<div id="allen-input-wrapper"><div id="allen-input-top"><span id="allen-input-match"></span><span id="allen-input-pinyin"></span></div><div id="allen-input-cand"></div></div>');
  allen.input.all_word = raw.split(';');
});

//folloing methods are for inserting text into textarea, got from internet
$.extend({
  unselectContents: function() {
    if(window.getSelection) {
      window.getSelection().removeAllRanges();
    } else if(document.selection) {
      document.selection.empty();
    }
  }
});

$.fn.extend({
  selectContents: function(){
    $(this).each(function(i){
      var node = this;
      var selection, range, doc, win;
      if ((doc = node.ownerDocument) &&
        (win = doc.defaultView) &&
        typeof win.getSelection != 'undefined' &&
        typeof doc.createRange != 'undefined' &&
        (selection = window.getSelection()) &&
        typeof selection.removeAllRanges != 'undefined')
      {
        range = doc.createRange();
        range.selectNode(node);
        if(i == 0){
          selection.removeAllRanges();
        }
        selection.addRange(range);
      }
      else if (document.body &&
           typeof document.body.createTextRange != 'undefined' &&
           (range = document.body.createTextRange()))
      {
        range.moveToElementText(node);
        range.select();
      }
    });
  },

  setCaret: function(){
    if(!$.browser.msie) return;
    var initSetCaret = function(){
      var textObj = $(this).get(0);
      textObj.caretPos = document.selection.createRange().duplicate();
    };
    $(this)
    .click(initSetCaret)
    .select(initSetCaret)
    .keyup(initSetCaret);
  },

  insertAtCaret: function(textFeildValue){
     var textObj = $(this).get(0);
     if(document.all && textObj.createTextRange && textObj.caretPos){
       var caretPos=textObj.caretPos;
       caretPos.text = caretPos.text.charAt(caretPos.text.length-1) == '' ?
                 textFeildValue+'' : textFeildValue;
     }
     else if(textObj.setSelectionRange){
       var rangeStart=textObj.selectionStart;
       var rangeEnd=textObj.selectionEnd;
       var tempStr1=textObj.value.substring(0,rangeStart);
       var tempStr2=textObj.value.substring(rangeEnd);
       textObj.value=tempStr1+textFeildValue+tempStr2;
       textObj.focus();
       var len=textFeildValue.length;
       textObj.setSelectionRange(rangeStart+len,rangeStart+len);
       textObj.blur();
     }
     else {
       textObj.value+=textFeildValue;
     }
  }
});

//temporary debug funtion
function myDebug(str) {
  $('body').append('<div class="debug_info">' + str + '</div>');
}