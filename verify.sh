

filename="$1"

while read -r line; do
	read -r name finish <<< "$line"
	echo "Name read from file - $name"
	timeout -k 30m 10m node facebook-naive.js verify "$name"
	if [ $? -eq 0 ]
	then
		sed -i "s/$name/$name\tfinished/" $filename
	else
		echo "$name verification failed"
		timeout -k 30m 10m node facebook-naive.js -n "$name" -d 20
		break
	fi
	sleep 10
done < "$filename"
