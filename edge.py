import cv2
import numpy as np

img = cv2.imread('s.jpg',0)
edges = cv2.Canny(img,100,200)
gray_filtered = cv2.bilateralFilter(img, 7, 50, 50)
edges_filtered = cv2.Canny(gray_filtered, 50, 60)
edges_filtered2 = cv2.Canny(gray_filtered, 10, 20)

images = np.hstack((img, edges_filtered, edges_filtered2))

cv2.imwrite('out.png', images)
