---
title: Projects: CV & SLAM
date: 2026-02-12
excerpt: My experience in SLAM + CV
---

## SLAM
Funnily enough, my first introduction to programming was a series of videos by George Hotz implementing [YOLO + SLAM in Python](https://www.youtube.com/watch?v=yuLf4Occu1Q).

At this point, I didn't know anything about programming, but around the same time, I had watched the Social Network and these two sources of media played an impressionable impact on me.

Many years later, during my first semester of University, I joined [WATonomous](https://www.watonomous.ca/), a Waterloo design club where I worked towards implementing SLAM + YOLO for an autonomous Rover deployed in a Mars-like environment.

It truly felt like a full-circle moment to work on the same problem that initially inspired me to start programming.

![WATo](/blog/wato.png)

<center>
YOLO + SLAM for our Rover in a simulated environment.
</center>

I worked at WATonomous for the majority of my first two semesters at University, working on improving our YOLO models and SLAM navigation, tinkering with ROS2 for simulation, and importing new 3D models to test our object detection.

![YOLO](/blog/yolo.png)

<center>
Object Detection Examples
</center>

## Parallel Robotics
A year later, I had another run in with computer vision.

Some of my friends and I decided to work on a new startup idea: automated robot assistants for nurses.

The general idea was as follows: given a random hospital, our robot should be able to map out the general environment of the hospital (SLAM) for navigation purposes, and detect objects in order to aid nurses (YOLO).

Within the process of building out the general software framework, there were a lot of different algorithms, but here's the general gist:

* - YOLO for object detection
* - MiDaS for depth estimation
* - vSLAM for mapping
* - Semantic Fusion for labelling 3D objects

![Parallel Robotics SLAM](/blog/SLAM.png)

<center>
Parallel Robotics SLAM
</center>

Being the only software engineer on the team, I orchestrated and developed everything within the span of a week, and am currently working on porting all algorithms to a NVIDIA Jetson Nano.

![ROS2 setup for Parallel Robotics](/blog/ros2.png)
<center>
ROS2 setup for Parallel Robotics
</center>
