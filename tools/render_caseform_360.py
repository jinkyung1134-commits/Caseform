import math
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def arg_after_dash(default):
    if "--" not in sys.argv:
        return default
    tail = sys.argv[sys.argv.index("--") + 1 :]
    return tail[0] if tail else default


OUTPUT_DIR = Path(arg_after_dash("caseform-360-frames"))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def material(name, color, metallic=0.0, roughness=0.55, noise=False, bump=False, emission=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = next((node for node in nodes if node.bl_idname == "ShaderNodeBsdfPrincipled"), None)
    if bsdf:
        if "Base Color" in bsdf.inputs:
            bsdf.inputs["Base Color"].default_value = color
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
        if emission:
            if "Emission Color" in bsdf.inputs:
                bsdf.inputs["Emission Color"].default_value = emission[0]
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = emission[1]
    if noise and bsdf:
        tex = nodes.new("ShaderNodeTexNoise")
        tex.inputs["Scale"].default_value = 78
        tex.inputs["Detail"].default_value = 13
        tex.inputs["Roughness"].default_value = 0.62
        color_ramp = nodes.new("ShaderNodeValToRGB")
        color_ramp.color_ramp.elements[0].position = 0.2
        color_ramp.color_ramp.elements[0].color = (0.002, 0.002, 0.0015, 1)
        color_ramp.color_ramp.elements[1].position = 1.0
        color_ramp.color_ramp.elements[1].color = (0.025, 0.022, 0.016, 1)
        mat.node_tree.links.new(tex.outputs["Fac"], color_ramp.inputs["Fac"])
        mat.node_tree.links.new(color_ramp.outputs["Color"], bsdf.inputs["Base Color"])
        if bump:
            bump_node = nodes.new("ShaderNodeBump")
            bump_node.inputs["Strength"].default_value = 0.045
            bump_node.inputs["Distance"].default_value = 0.05
            mat.node_tree.links.new(tex.outputs["Fac"], bump_node.inputs["Height"])
            mat.node_tree.links.new(bump_node.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def add_rounded_box(name, loc, dims, mat, bevel=0.06, segments=8, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("soft bevel", "BEVEL")
        mod.width = bevel
        mod.segments = segments
        mod.profile = 0.5
        obj.modifiers.new("weighted product normals", "WEIGHTED_NORMAL")
    if parent:
        obj.parent = parent
    return obj


def add_plane(name, loc, scale, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    if mat:
        obj.data.materials.append(mat)
    return obj


def add_cylinder(name, loc, radius, depth, mat, parent=None, vertices=96):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=loc,
        rotation=(math.pi / 2, 0, 0),
    )
    obj = bpy.context.object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    obj.modifiers.new("lens normals", "WEIGHTED_NORMAL")
    if parent:
        obj.parent = parent
    return obj


def add_torus(name, loc, major_radius, minor_radius, mat, parent=None):
    bpy.ops.mesh.primitive_torus_add(
        major_segments=120,
        minor_segments=16,
        major_radius=major_radius,
        minor_radius=minor_radius,
        location=loc,
        rotation=(math.pi / 2, 0, 0),
    )
    obj = bpy.context.object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


clear_scene()

black_leather = material("soft black grained polymer", (0.018, 0.016, 0.013, 1), roughness=0.82, noise=True, bump=True)
deep_black = material("deep satin black", (0.004, 0.004, 0.004, 1), roughness=0.68)
groove_black = material("shadowed grid grooves", (0.0, 0.0, 0.0, 1), roughness=0.9)
gold = material("brushed warm gold", (0.92, 0.58, 0.18, 1), metallic=1.0, roughness=0.28)
muted_gold = material("muted gold reflection", (0.65, 0.39, 0.12, 1), metallic=1.0, roughness=0.42)
glass = material("black camera glass", (0.002, 0.002, 0.004, 1), roughness=0.16)
flash = material("soft camera flash", (1.0, 0.82, 0.52, 1), metallic=0.0, roughness=0.2)
floor_mat = material("black mirror floor", (0.004, 0.004, 0.004, 1), metallic=0.0, roughness=0.35)
wall_mat = material("near black studio wall", (0.006, 0.005, 0.004, 1), roughness=0.9)

root = bpy.data.objects.new("Caseform 360 sample case", None)
bpy.context.collection.objects.link(root)

case_w, case_d, case_h = 2.18, 0.38, 4.45
back_y = -case_d / 2
front_y = case_d / 2

add_rounded_box("case shell", (0, 0, 0), (case_w, case_d, case_h), black_leather, bevel=0.19, segments=24, parent=root)

# Front side lip: enough detail to make the 180-degree view read as an actual case, not a flat card.
add_rounded_box("front raised lip", (0, front_y + 0.025, -0.03), (case_w - 0.12, 0.055, case_h - 0.18), deep_black, bevel=0.17, segments=20, parent=root)
add_rounded_box("front recessed opening", (0, front_y + 0.06, -0.05), (case_w - 0.42, 0.032, case_h - 0.62), wall_mat, bevel=0.13, segments=18, parent=root)

# Back grid grooves and small intersections.
for x in [-0.47, 0.0, 0.47]:
    add_rounded_box(f"vertical groove {x}", (x, back_y - 0.023, -0.42), (0.018, 0.035, 2.85), groove_black, bevel=0.008, segments=3, parent=root)
for z in [-1.55, -0.88, -0.21, 0.46, 1.13]:
    add_rounded_box(f"horizontal groove {z}", (0.08, back_y - 0.024, z), (1.6, 0.035, 0.018), groove_black, bevel=0.008, segments=3, parent=root)
for x in [-0.47, 0.0, 0.47]:
    for z in [-1.55, -0.88, -0.21, 0.46, 1.13]:
        add_rounded_box(f"grid node {x} {z}", (x, back_y - 0.028, z), (0.06, 0.04, 0.06), groove_black, bevel=0.018, segments=6, parent=root)

# Camera island: raised gold frame, black plate, glass lenses, flash.
cam_x, cam_z = -0.48, 1.48
add_rounded_box("gold camera island frame", (cam_x, back_y - 0.042, cam_z), (0.86, 0.085, 0.86), gold, bevel=0.12, segments=18, parent=root)
add_rounded_box("black camera island", (cam_x, back_y - 0.09, cam_z), (0.67, 0.095, 0.67), deep_black, bevel=0.09, segments=16, parent=root)

lens_offsets = [(-0.17, 0.18), (0.17, 0.18), (-0.17, -0.16)]
for idx, (lx, lz) in enumerate(lens_offsets, start=1):
    add_torus(f"gold lens ring {idx}", (cam_x + lx, back_y - 0.155, cam_z + lz), 0.105, 0.012, muted_gold, parent=root)
    add_cylinder(f"glass lens {idx}", (cam_x + lx, back_y - 0.174, cam_z + lz), 0.094, 0.034, glass, parent=root)
    add_cylinder(f"lens highlight {idx}", (cam_x + lx - 0.026, back_y - 0.195, cam_z + lz + 0.028), 0.021, 0.012, material(f"lens highlight mat {idx}", (0.13, 0.16, 0.18, 1), roughness=0.1), parent=root, vertices=48)

add_cylinder("camera flash", (cam_x + 0.18, back_y - 0.174, cam_z - 0.14), 0.05, 0.025, flash, parent=root, vertices=64)
add_cylinder("small lidar dot", (cam_x + 0.18, back_y - 0.174, cam_z - 0.31), 0.045, 0.025, glass, parent=root, vertices=64)

# Side buttons.
add_rounded_box("gold side button", (case_w / 2 + 0.035, -0.025, 0.62), (0.075, 0.14, 0.62), gold, bevel=0.035, segments=12, parent=root)
add_rounded_box("black texture side strip", (case_w / 2 + 0.037, -0.02, -0.25), (0.058, 0.12, 0.72), groove_black, bevel=0.03, segments=10, parent=root)
add_rounded_box("opposite volume button", (-case_w / 2 - 0.028, -0.02, 0.78), (0.055, 0.12, 0.78), deep_black, bevel=0.03, segments=10, parent=root)

# Minimal port hint on the lower edge.
add_rounded_box("bottom port shadow", (0, -0.01, -case_h / 2 - 0.018), (0.42, 0.12, 0.035), groove_black, bevel=0.018, segments=6, parent=root)

# Studio floor and background stay separate from the rotating case.
add_plane("studio floor", (0, 0.0, -2.285), (80, 60, 1), floor_mat)
add_plane("studio wall", (0, 3.2, 0.25), (80, 30, 1), wall_mat, rotation=(math.pi / 2, 0, 0))

# Warm vertical glow panels behind the model.
glow_mat = material("soft gold vertical glow", (0.85, 0.48, 0.12, 1), metallic=0.0, roughness=0.45, emission=((1.0, 0.55, 0.12, 1), 1.4))
add_rounded_box("rear gold glow left", (-1.5, 3.08, 0.03), (0.055, 0.035, 3.6), glow_mat, bevel=0.05, segments=12)
add_rounded_box("rear gold glow right", (1.5, 3.08, 0.03), (0.055, 0.035, 3.6), glow_mat, bevel=0.05, segments=12)

for name, loc, power, size, color in [
    ("large soft key", (-3.6, -4.8, 4.0), 340, 4.8, (1.0, 0.9, 0.74)),
    ("gold rim right", (3.4, -1.2, 1.4), 420, 2.0, (1.0, 0.58, 0.18)),
    ("gold back wash", (0.0, 2.0, 2.0), 210, 4.2, (1.0, 0.54, 0.16)),
    ("subtle front fill", (0.0, -4.0, 0.2), 65, 5.0, (0.45, 0.50, 0.62)),
]:
    bpy.ops.object.light_add(type="AREA", location=loc)
    light = bpy.context.object
    light.name = name
    light.data.energy = power
    light.data.size = size
    light.data.color = color

bpy.ops.object.camera_add(location=(3.2, -9.8, 1.05))
camera = bpy.context.object
look_at(camera, (0.0, 0.0, 0.0))
camera.data.lens = 34
camera.data.dof.use_dof = True
camera.data.dof.focus_object = root
camera.data.dof.aperture_fstop = 6.5
bpy.context.scene.camera = camera

scene = bpy.context.scene
scene.frame_start = 1
scene.frame_end = int(os.environ.get("CASEFORM_RENDER_FRAMES", "180"))
scene.frame_set(1)


def rotate_sample_case(render_scene):
    span = render_scene.frame_end - render_scene.frame_start + 1
    progress = (render_scene.frame_current - render_scene.frame_start) / span
    root.rotation_euler = (0, 0, math.tau * progress)


bpy.app.handlers.frame_change_pre.append(rotate_sample_case)

try:
    scene.render.engine = "BLENDER_EEVEE_NEXT"
except TypeError:
    scene.render.engine = "BLENDER_EEVEE"

if hasattr(scene, "eevee"):
    for attr, value in [
        ("taa_render_samples", 96),
        ("use_gtao", True),
        ("gtao_distance", 4),
        ("gtao_factor", 1.6),
        ("use_bloom", True),
    ]:
        if hasattr(scene.eevee, attr):
            setattr(scene.eevee, attr, value)

scene.render.resolution_x = 1920
scene.render.resolution_y = 1200
scene.render.fps = 30
scene.render.film_transparent = False
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(OUTPUT_DIR / "caseform_360_")

world = scene.world or bpy.data.worlds.new("World")
scene.world = world
world.color = (0.004, 0.0035, 0.003)

scene.view_settings.view_transform = "Filmic"
scene.view_settings.look = "Medium High Contrast"
scene.view_settings.exposure = -0.35
scene.view_settings.gamma = 1.0

bpy.ops.render.render(animation=True)
