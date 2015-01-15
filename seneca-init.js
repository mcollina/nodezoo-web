'use strict';

var seneca = require('seneca');
var api = seneca();

var beanstakIP = process.env.BEANSTALK_IP || 'localhost';
var influxIP = process.env.INFLUX_IP || 'localhost';


if( 'dev' !== api.options().env ) {
  api
    .use('./lib/api.js')
    .use('beanstalk-transport')
    .use('data-editor')
    .use('msgstats', { influxOpts: { host: influxIP, database: 'stats', seriesName: 'actions', username: 'root', password: 'root', port: '8086' } })
    .use('admin', {local:true})
    .client({host: beanstakIP, type: 'beanstalk', port:1130, pin:'role:info,cmd:*'})
    .client({host: beanstakIP, type: 'beanstalk', port:1130, pin:'role:search,cmd:*'})
    .listen({host: beanstakIP, type: 'beanstalk', port:1130});
}
else {
  api
    .use('jsonfile-store',{folder:__dirname+'/data'})
    .use('../nodezoo-github')
    .use('../nodezoo-npm')
    .use('../nodezoo-info')
    .use('../nodezoo-index')
    .use('./lib/api.js')
  
    .add('role:info,req:part',function(args,done){
      done();
      
      this.act(
        'role:npm,cmd:get',
        {name:args.name},
        function(err,mod){
          this.act('role:info,res:part,part:npm',
                   {name:args.name,data:mod});
            
          this.act(
            'role:github,cmd:get',
            {name:args.name,giturl:mod.giturl},
            function(err,mod){
              this.act('role:info,res:part,part:github',
                       {name:args.name,data:mod});
            });
        });
    });
}


module.exports = function(){
  return api.export('web');
};

