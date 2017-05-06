# mediasoup_sample
Exsamples for WebRTC SFU mediasoup with node.js (Multiple participants / 1 way realtime streaming)

* mediasoup GitHub [https://github.com/versatica/mediasoup](https://github.com/versatica/mediasoup)
* mediasoup Web site [https://mediasoup.org](https://mediasoup.org)
* This sample has updated to support mediasoup v1.1. This does not work with mediasoup v0.x any more.
* Now works correctly for 3 or more participans with Chrome/Firefox
* Add samples for 1 way realtime streaming. 

Node.jsで動くWebRTC SFU mediasoupのサンプルです。

* v1.1用に更新しました。v0.xでは動作しません。
* Chrome/Firefox共に3名以上の参加者の場合でも正しく動作するようになりました
* 1方向の映像配信/視聴のサンプルを追加しました


# Installation

## git clone
```
git clone https://github.com/mganeko/mediasoup_sample.git
cd mediasoup_sample/
```
git cloneします。

## install npm modules

```
$ npm install ws
$ npm install express
$ npm install mediasoup
```
or
```
$ npm install
```

Python 2, make, g++ or clang are required for installing mediasoup.

npm モジュールをインストールします。mediasoupのインストールには Python 2, make, g++かclang が必要です。


# How to use

## run server app
```
$ node mediasoup_sample_multi.js
```
or
```
$ npm start
```

サーバーを起動します。Webサーバー、WebSocketによるシグナリングサーバー、SFUサーバーを兼ねています。


## access with browser

### bidirectional video chat  

* open [http://localhost:3000/](http://localhost:3000/) with Chrome or Firefox.
* click [Start Video] button, then [Connect] button

双方向ビデオチャット

* ブラウザ(Chrome か Firefox)で [http://localhost:3000/](http://localhost:3000/) にアクセスします。
* [Start Video] ボタンをクリックしてカメラとマイクを取得し、 [Connect] ボタンで通信を開始します


### 1 way realtime streaming

* open [http://localhost:3000/talk.html](http://localhost:3000/talk.html) with Chrome or Firefox.
* click [Start Video] button, then [Connect] button
* open [http://localhost:3000/watch.html](http://localhost:3000/watch.html) with Chrome or Firefox.
* click [Connect] button to watch realtime striming

1方向の映像配信/視聴

* ブラウザ(Chrome か Firefox)で [http://localhost:3000/talk.html](http://localhost:3000/talk.html) にアクセスします
* [Start Video] ボタンをクリックしてカメラとマイクを取得し、 [Connect] ボタンで配信を開始します
* 視聴するには[http://localhost:3000/watch.html](http://localhost:3000/watch.html)にアクセスし、[Connect] ボタンをクリックします

