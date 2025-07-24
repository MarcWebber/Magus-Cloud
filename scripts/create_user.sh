pure-pw useradd chensheng -u www -g www -d /www/wwwroot/chensheng
pure-pw mkdb
mkdir -p /www/wwwroot/chensheng && chown www:www /www/wwwroot/chensheng
# 这一行仅仅作为测试
pure-pw list
