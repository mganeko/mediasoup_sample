# mediasoup_sample
Multiple participants sample for WebRTC SFU mediasoup with node.js 

* mediasoup GitHub [https://github.com/ibc/mediasoup](https://github.com/ibc/mediasoup)
* mediasoup Web site [https://mediasoup.org](https://mediasoup.org)
* This sample works with mediasoup v0.3. This does not work with mediasoup v0.5 yet.

Node.jsで動くWebRTC SFU mediasoupのサンプルです。v0.3用であり、v0.5ではまだ動作しません。

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