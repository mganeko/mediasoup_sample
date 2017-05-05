# mediasoup_sample
Multiple participants sample for WebRTC SFU mediasoup with node.js 

* mediasoup GitHub [https://github.com/ibc/mediasoup](https://github.com/ibc/mediasoup)
* mediasoup Web site [https://mediasoup.org](https://mediasoup.org)
* This sample has updated to support mediasoup v1.1. This does not work with mediasoup v0.x any more.
* With Chrome, this works for 2 participants. This does not work correctly for 3 or more participants.
* With Firefox, thsi works for 2 or more participants correctly.

Node.jsで動くWebRTC SFU mediasoupのサンプルです。

* v1.1用に更新しました。v0.xでは動作しません。
* Chromeの場合は3名以上の参加者がいる場合には、正常に動作しません。(最初の参加者に3番目の参加者の映像が届きません) 
* Firefoxの場合は 3名以上でも正常に動作します。


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


## access with borwser

* open [http://localhost:3000/](http://localhost:3000/) with Chrome or Firefox.
* click [Start Video] button, then [Connect] button

ブラウザ(Chrome か Firefox)で [http://localhost:3000/](http://localhost:3000/) にアクセスします。