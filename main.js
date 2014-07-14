var zmq = require('zmq');
var sync = zmq.socket('pull');
var pub = zmq.socket('pub');
var fs = require("fs");
var async = require("async");
var LockableQueue = require('./LockableQueue');
var queue = new LockableQueue();

sync.bind('tcp://127.0.0.1:8902');
pub.bind('tcp://127.0.0.1:8903');

function processEmails()
{
    var path = '../pulse-integration-tests/emails/';
    async.waterfall([
        
        function readDirectory(callback) {
            fs.readdir(path, function(err, files) {
                callback(err, files);
            });
        },
        
        function filterOutNoFiles(files, callback) {
            async.filter(files, function(file, iteratorCallback){
                fs.stat(path + file, function(err, stats) {
                    if(err) {
                        iteratorCallback(false);
                    } else {
                        iteratorCallback(stats.isFile());
                    }
                });
            }, function(filteredFiles) {
                callback(null, filteredFiles);
            });
        },
        
        function addFilesToQueue(files, callback) {
            files.forEach(function(file) {
                queue.add(file);
            });
            callback();
        },
        
        function getNextFileFromQueue(callback) {
            try {
                var file = queue.lockNext();
                callback(null, file);
            } catch(err) {
                callback(new Error('No files in queue'));
            }
        },
        
        function processFile(file, callback) {
            fs.readFile(path + file, function(err, data) {
                if(err) {
                    callback(err, '');
                }
                pub.send(data);
                fs.unlink(path + file, function(err) {
                    queue.remove(file);
                    callback(err, 'done');
                });
            });
        }
        
    ], function(err, result) {
        setImmediate(processEmails);
    });
}
setImmediate(processEmails);
console.log('pulse-email-reading-service is running');

sync.on('message', function (data) {
    sync.close();
    console.log('pulse-email-reading-service subscriber is connected');
    setImmediate(processEmails);

});

process.on('exit', pub.close);